from pydantic import BaseModel
from typing import List, Dict, Optional
import datetime

class MaintenanceRecommendation(BaseModel):
    id: int
    fault_detected: str
    severity: str
    health_score: float
    recommended_action: str
    action_priority: int
    status: str
    timestamp: datetime.datetime

class DegradationTrendPoint(BaseModel):
    timestamp: str
    health_index: float
    vibration_rms: float
    anomaly_score: float
    operating_state: str

class MaintenanceAnalysisResponse(BaseModel):
    current_health_score: float
    anomaly_status: str          # "NORMAL", "ANOMALY_DETECTED"
    anomaly_score: float         # Isolation forest decision function value
    fault_severity: str          # "NORMAL", "LOW", "MODERATE", "CRITICAL"
    estimated_degradation_pct: float
    rul_notice: str              # Explaining distinction between degradation estimate and validated run-to-failure RUL
    recommended_actions: List[str]
    trend_history: List[DegradationTrendPoint]
