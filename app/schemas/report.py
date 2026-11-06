from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any
import datetime

class MaintenanceReportCreate(BaseModel):
    title: Optional[str] = "Routine Motor Vibration & Condition Inspection Report"
    technician_name: Optional[str] = "Lead Reliability Engineer"
    engineer_notes: Optional[str] = None
    diagnosis_id: Optional[int] = None

class ActionItem(BaseModel):
    priority: str  # "IMMEDIATE", "SCHEDULED", "ROUTINE"
    description: str
    target_component: str

class MaintenanceReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_reference: str
    timestamp: datetime.datetime
    title: str
    technician_name: str
    motor_spec: str
    operating_condition: str
    diagnosed_fault: str
    fault_confidence: float
    health_score: float
    severity: str
    iso_zone: str
    vibration_rms: float
    vibration_peak: float
    component_assessments: Optional[Dict[str, str]] = None
    recommended_actions: List[Dict[str, Any]]
    engineer_notes: Optional[str] = None
    rul_statement: str
