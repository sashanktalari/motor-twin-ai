import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import numpy as np

from app.database.session import get_db
from app.database.models import DiagnosisRecord, DatasetRecord, MaintenanceLog
from app.schemas.diagnosis import PredictionRequest, PredictionResponse, SignalAnalysisRequest, SignalAnalysisResponse
from app.ml.model_manager import model_manager
from app.services.dataset_service import DatasetService
from app.services.signal_processing import SignalProcessor
from app.core.config import settings
from app.core.logging import logger

router = APIRouter()

@router.post("/predict")
def predict_fault(req: PredictionRequest, db: Session = Depends(get_db)):
    """
    Executes real-time ML fault diagnosis using trained Random Forest or SVM models
    on time and frequency domain vibration features.
    Saves diagnosis in SQLite and generates maintenance recommendations when faults occur.
    """
    fs = req.sampling_rate_hz
    signal_segment = None
    source_ref = "Custom Signal Input"
    operating_load = req.load_hp
    rpm = settings.DEFAULT_RATED_RPM

    # 1. Resolve signal segment according to source_type
    if req.source_type == "DATASET" and req.dataset_id:
        ds = db.query(DatasetRecord).filter(DatasetRecord.id == req.dataset_id).first()
        if not ds:
            raise HTTPException(status_code=404, detail="Selected dataset not found.")
        source_ref = ds.name
        operating_load = ds.motor_load_hp

        file_path = settings.RAW_DATASETS_DIR / ds.filename
        if not file_path.exists():
            alt_path = settings.RAW_DATASETS_DIR / (ds.filename.rsplit('.', 1)[0] + '.csv')
            if alt_path.exists():
                file_path = alt_path
            else:
                raise HTTPException(status_code=404, detail=f"Dataset file '{ds.filename}' not found on disk.")

        parsed = DatasetService.load_signal_file(file_path)
        raw_sig = parsed["signal"]
        fs = parsed["sampling_rate_hz"]
        rpm = parsed.get("rpm", 1797.0)

        # Slice window (e.g. 2048 samples) starting at sample_index
        idx = max(0, req.sample_index or 0)
        window_size = 2048
        if idx + window_size <= len(raw_sig):
            signal_segment = raw_sig[idx : idx + window_size]
        else:
            signal_segment = raw_sig[-window_size:] if len(raw_sig) >= window_size else raw_sig

    elif req.signal_data and len(req.signal_data) >= 100:
        signal_segment = np.array(req.signal_data, dtype=np.float64)
        source_ref = f"{req.source_type} Signal"
    else:
        raise HTTPException(
            status_code=400,
            detail="No valid vibration signal provided. Specify dataset_id or provide signal_data array (min 100 samples)."
        )

    # 2. Execute ML Inference
    try:
        diag = model_manager.predict(signal_segment, fs=fs, model_name=req.model_name)
    except RuntimeError as re:
        raise HTTPException(status_code=503, detail=str(re))
    except Exception as e:
        logger.error(f"Inference error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference pipeline failed: {str(e)}")

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    feats = diag["features"]

    # 3. Persist record in database
    rec = DiagnosisRecord(
        timestamp=now_utc,
        source_type=req.source_type,
        source_reference=source_ref,
        predicted_fault=diag["predicted_fault"],
        confidence=diag["confidence"],
        probabilities=diag["probabilities"],
        health_score=diag["health_score"],
        rms_vibration=feats["rms"],
        peak_vibration=feats["peak"],
        dominant_frequency=feats["dominant_frequency"],
        features=feats,
        operating_load_hp=operating_load,
        rotational_speed_rpm=rpm
    )
    db.add(rec)

    # If fault or anomaly detected, create maintenance log entry
    if diag["predicted_fault"] != "Normal" or diag.get("anomaly_detected"):
        rec_action = (
            f"Schedule physical inspection of {diag['predicted_fault'].lower()} assembly. "
            f"Verify bearing grease lubrication, check for acoustic spalling and defect harmonics."
        )
        prio = 1 if diag["severity"] == "CRITICAL" else 2
        m_log = MaintenanceLog(
            timestamp=now_utc,
            fault_detected=diag["predicted_fault"],
            severity=diag["severity"],
            health_score=diag["health_score"],
            recommended_action=rec_action,
            status="PENDING",
            action_priority=prio
        )
        db.add(m_log)

    db.commit()
    db.refresh(rec)

    return {
        "id": rec.id,
        "predicted_fault": diag["predicted_fault"],
        "confidence": diag["confidence"],
        "probabilities": diag["probabilities"],
        "health_score": diag["health_score"],
        "features": feats,
        "source_type": req.source_type,
        "severity": diag["severity"],
        "anomaly_detected": diag.get("anomaly_detected", False),
        "anomaly_score": diag.get("anomaly_score", 0.0),
        "timestamp": now_utc.isoformat(),
        "model_used": diag["model_used"]
    }

@router.post("/analyze-signal")
def analyze_signal(req: SignalAnalysisRequest):
    """
    Computes comprehensive engineering signal analysis:
    - Time-domain waveform preview
    - 16 Statistical & Spectral features
    - Fast Fourier Transform (FFT) spectrum
    - Bearing kinematic defect frequencies (BPFI, BPFO, BSF, FTF)
    - Short-Time Fourier Transform (STFT) Spectrogram
    """
    if len(req.signal) < 64:
        raise HTTPException(status_code=400, detail="Signal length must contain at least 64 samples.")

    sig = np.array(req.signal, dtype=np.float64)
    fs = float(req.sampling_rate_hz)

    # 1. Feature extraction
    features = SignalProcessor.extract_all_features(sig, fs=fs)

    # 2. FFT spectrum
    _, freqs, mags = SignalProcessor.extract_frequency_features(sig, fs=fs)
    
    # Subsample spectrum to max 400 bins for responsive rendering
    f_step = max(1, len(freqs) // 400)
    spectrum_freqs = [round(float(v), 1) for v in freqs[::f_step]]
    spectrum_mags = [round(float(v), 5) for v in mags[::f_step]]

    # 3. Waveform preview (max 800 points)
    w_step = max(1, len(sig) // 800)
    waveform_preview = [round(float(v), 5) for v in sig[::w_step]]
    time_axis = [round(float(i * w_step / fs), 6) for i in range(len(waveform_preview))]

    # 4. Defect frequencies
    defect_freqs = SignalProcessor.calculate_defect_frequencies(settings.DEFAULT_RATED_RPM)

    # 5. Spectrogram if requested
    spectrogram_data = None
    if req.include_spectrogram:
        spectrogram_data = SignalProcessor.compute_spectrogram(sig, fs=fs, nperseg=req.window_size)

    return {
        "features": features,
        "time_series_preview": waveform_preview,
        "time_axis": time_axis,
        "frequencies": spectrum_freqs,
        "fft_magnitudes": spectrum_mags,
        "defect_frequencies": defect_freqs,
        "spectrogram": spectrogram_data
    }

@router.get("/history")
def get_diagnosis_history(limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieves historical diagnosis assessments from SQLite.
    """
    records = db.query(DiagnosisRecord).order_by(DiagnosisRecord.timestamp.desc()).limit(limit).all()
    return [{
        "id": r.id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else "",
        "source_type": r.source_type,
        "source_reference": r.source_reference,
        "predicted_fault": r.predicted_fault,
        "confidence": round(float(r.confidence), 4),
        "health_score": round(float(r.health_score), 1),
        "rms_vibration": round(float(r.rms_vibration), 4) if r.rms_vibration is not None else None,
        "peak_vibration": round(float(r.peak_vibration), 4) if r.peak_vibration is not None else None,
        "dominant_frequency": round(float(r.dominant_frequency), 2) if r.dominant_frequency is not None else None,
        "operating_load_hp": r.operating_load_hp,
        "rotational_speed_rpm": r.rotational_speed_rpm
    } for r in records]
