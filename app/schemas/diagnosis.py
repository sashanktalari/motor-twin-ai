from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import datetime

class VibrationFeatures(BaseModel):
    # Time Domain
    mean: float
    std: float
    rms: float
    variance: float
    peak_to_peak: float = 0.0
    skewness: float
    kurtosis: float
    peak: float
    crest_factor: float
    shape_factor: float
    impulse_factor: float
    
    # Frequency Domain
    dominant_frequency: float
    spectral_centroid: float
    spectral_energy: float
    spectral_std: float
    spectral_skewness: float
    spectral_kurtosis: float

class PredictionRequest(BaseModel):
    source_type: str = Field("DATASET", description="'DATASET', 'SIMULATION', or 'RAW'")
    dataset_id: Optional[int] = None
    sample_index: Optional[int] = 0
    signal_data: Optional[List[float]] = None
    sampling_rate_hz: float = 12000.0
    load_hp: float = 1.0
    model_name: str = Field("random_forest", description="'random_forest', 'svm', or 'knn'")

class PredictionResponse(BaseModel):
    predicted_fault: str
    confidence: float
    probabilities: Dict[str, float]
    health_score: float
    features: VibrationFeatures
    source_type: str
    severity: str
    timestamp: datetime.datetime
    model_used: str

class SignalAnalysisRequest(BaseModel):
    signal: List[float]
    sampling_rate_hz: float = 12000.0
    include_spectrogram: bool = False
    window_size: int = 256

class SignalAnalysisResponse(BaseModel):
    features: VibrationFeatures
    time_series_preview: List[float]
    time_axis: List[float]
    frequencies: List[float]
    fft_magnitudes: List[float]
    defect_frequencies: Dict[str, float]
    spectrogram: Optional[Dict[str, Any]] = None

class DiagnosisHistoryItem(BaseModel):
    id: int
    timestamp: datetime.datetime
    source_type: str
    predicted_fault: str
    confidence: float
    health_score: float
    rms_vibration: Optional[float]
    peak_vibration: Optional[float]
    dominant_frequency: Optional[float]
    operating_load_hp: float
