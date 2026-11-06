from pydantic import BaseModel
from typing import Dict, Optional, Any

class MotorTelemetry(BaseModel):
    rpm: float = 1797.0
    load_hp: float = 1.0
    voltage_v: float = 460.0
    current_a: float = 2.85
    frequency_hz: float = 60.0
    power_factor: float = 0.86
    vibration_rms_g: float = 0.082
    peak_vibration_g: float = 0.245
    temperature_c: float = 52.4
    health_score: float = 98.5
    status: str = "NORMAL"  # "NORMAL", "WARNING", "FAULT"
    fault_type: str = "Normal"
    fault_severity: str = "NONE" # "NONE", "LOW", "MODERATE", "CRITICAL"
    data_source: str = "CWRU_BENCHMARK" # "CWRU_BENCHMARK", "SIMULATION", "USER_UPLOAD"
    last_updated: str

class DigitalTwinState(BaseModel):
    telemetry: MotorTelemetry
    component_health: Dict[str, float]  # {"drive_end_bearing": 98.0, "fan_end_bearing": 99.0, "stator_windings": 97.5, "rotor_bars": 99.0}
    operating_mode: str = "DATASET_TRACKING" # "DATASET_TRACKING" or "PHYSICS_SIMULATION"
    disclaimer: str = "Virtual Representation Synchronized with Selected Signal & ML Inference"
