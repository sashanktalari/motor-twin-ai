import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import numpy as np

from app.database.session import get_db
from app.database.models import DatasetRecord
from app.core.config import settings
from app.core.logging import logger
from app.services.dataset_service import DatasetService
from app.services.signal_processing import SignalProcessor

router = APIRouter()

@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    """
    Returns registered datasets (both benchmark CWRU files and uploaded files).
    """
    try:
        records = db.query(DatasetRecord).order_by(DatasetRecord.id.asc()).all()
        return [{
            "id": r.id,
            "name": r.name,
            "filename": r.filename,
            "file_type": r.file_type,
            "sampling_rate_hz": r.sampling_rate_hz,
            "fault_class": r.fault_class,
            "motor_load_hp": r.motor_load_hp,
            "sample_count": r.sample_count,
            "duration_seconds": r.duration_seconds,
            "is_benchmark": bool(r.is_benchmark),
            "created_at": r.created_at.isoformat() if r.created_at else ""
        } for r in records]
    except Exception as e:
        logger.error(f"Error listing datasets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list datasets: {str(e)}")

@router.get("/{dataset_id}")
def get_dataset_detail(dataset_id: int, db: Session = Depends(get_db)):
    """
    Retrieves full details for a dataset, loading actual raw vibration data,
    preview series (downsampled for transmission), and exact computed statistical features.
    """
    record = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")

    file_path = settings.RAW_DATASETS_DIR / record.filename
    if not file_path.exists():
        # Check alternative extension
        alt_path = settings.RAW_DATASETS_DIR / (record.filename.rsplit('.', 1)[0] + '.csv')
        if alt_path.exists():
            file_path = alt_path
        else:
            raise HTTPException(status_code=404, detail=f"Dataset file '{record.filename}' not found on disk.")

    try:
        parsed = DatasetService.load_signal_file(file_path)
        sig = parsed["signal"]
        fs = parsed["sampling_rate_hz"]

        # Downsample or slice preview to 1000 points
        preview_len = min(len(sig), 1000)
        preview_slice = sig[:preview_len]
        time_axis = [round(float(i / fs), 6) for i in range(preview_len)]

        # Extract real statistical & spectral features
        summary_features = SignalProcessor.extract_all_features(sig[: min(len(sig), 12000)], fs=fs)

        return {
            "id": record.id,
            "name": record.name,
            "filename": record.filename,
            "file_type": record.file_type,
            "sampling_rate_hz": record.sampling_rate_hz,
            "fault_class": record.fault_class,
            "motor_load_hp": record.motor_load_hp,
            "sample_count": len(sig),
            "duration_seconds": round(float(len(sig) / fs), 2),
            "is_benchmark": bool(record.is_benchmark),
            "preview_signal": [round(float(v), 5) for v in preview_slice],
            "time_axis": time_axis,
            "summary_features": summary_features,
            "defect_frequencies": SignalProcessor.calculate_defect_frequencies(parsed.get("rpm", 1797.0))
        }
    except Exception as e:
        logger.error(f"Error loading dataset detail {dataset_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to read signal data: {str(e)}")

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload and parse a compatible vibration dataset (.mat or .csv).
    Validates signal dimensions, extracts sampling properties, and registers in database.
    """
    filename = file.filename or "uploaded_signal.csv"
    ext = Path(filename).suffix.lower()
    if ext not in [".mat", ".csv", ".txt"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only MATLAB (.mat) and CSV (.csv) files are supported.")

    save_path = settings.RAW_DATASETS_DIR / filename
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Parse and validate with DatasetService
        parsed = DatasetService.load_signal_file(save_path)
        sig = parsed["signal"]
        fs = parsed["sampling_rate_hz"]
        duration = float(len(sig) / fs)

        # Infer fault class from filename if keywords exist
        f_lower = filename.lower()
        if "inner" in f_lower or "ir" in f_lower:
            fault_class = "Inner Race Fault"
        elif "ball" in f_lower or "b_" in f_lower:
            fault_class = "Ball Fault"
        elif "outer" in f_lower or "or" in f_lower:
            fault_class = "Outer Race Fault"
        elif "normal" in f_lower:
            fault_class = "Normal"
        else:
            fault_class = "Unclassified / Custom"

        db_record = DatasetRecord(
            name=Path(filename).stem.replace("_", " "),
            filename=filename,
            file_type="MAT" if ext == ".mat" else "CSV",
            sampling_rate_hz=fs,
            fault_class=fault_class,
            motor_load_hp=1.0,
            sample_count=len(sig),
            duration_seconds=round(duration, 2),
            is_benchmark=0
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        return {
            "success": True,
            "message": f"Successfully ingested '{filename}' with {len(sig)} samples ({round(duration, 2)} s).",
            "dataset_id": db_record.id,
            "sample_count": len(sig),
            "sampling_rate_hz": fs,
            "fault_class": fault_class
        }
    except Exception as e:
        db.rollback()
        if save_path.exists():
            save_path.unlink()
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to ingest file: {str(e)}")

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """
    Deletes an uploaded dataset record. Official CWRU benchmark records cannot be deleted.
    """
    record = db.query(DatasetRecord).filter(DatasetRecord.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    if record.is_benchmark:
        raise HTTPException(status_code=403, detail="Cannot delete core CWRU benchmark datasets.")

    # Remove physical file if safe
    file_path = settings.RAW_DATASETS_DIR / record.filename
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            logger.warning(f"Could not remove physical dataset file: {e}")

    db.delete(record)
    db.commit()
    return {"status": "success", "message": f"Dataset '{record.name}' deleted successfully."}
