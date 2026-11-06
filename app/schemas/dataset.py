from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DatasetItem(BaseModel):
    id: int
    name: str
    filename: str
    file_type: str
    fault_class: str
    motor_load_hp: float
    sampling_rate_hz: float
    sample_count: int
    duration_seconds: float
    is_benchmark: bool
    created_at: str

class DatasetDetail(DatasetItem):
    preview_signal: List[float]
    time_axis: List[float]
    summary_features: Dict[str, float]
    metadata_fields: Dict[str, Any]
