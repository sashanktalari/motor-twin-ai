from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class ModelMetricSet(BaseModel):
    model_name: str
    display_name: str
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    classes: List[str]
    classification_report: Dict[str, Dict[str, float]]
    confusion_matrix: List[List[int]]
    train_samples: int
    test_samples: int
    training_duration_seconds: float
    validation_split_methodology: str

class ModelPerformanceResponse(BaseModel):
    is_trained: bool
    models: List[ModelMetricSet]
    feature_names: List[str]
    best_model: str
    dataset_summary: Dict[str, Any]
    last_trained_at: Optional[str] = None
