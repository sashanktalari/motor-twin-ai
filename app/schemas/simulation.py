from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SimulationConfig(BaseModel):
    fault_type: str = Field("Normal", description="'Normal', 'Inner Race Fault', 'Ball Fault', 'Outer Race Fault'")
    rpm: float = Field(1797.0, ge=300.0, le=3600.0)
    load_hp: float = Field(1.0, ge=0.0, le=5.0)
    duration_seconds: float = Field(0.5, ge=0.1, le=5.0)
    sampling_rate_hz: float = Field(12000.0, ge=1000.0, le=48000.0)
    noise_level: float = Field(0.05, ge=0.0, le=1.0)
    amplitude_scaling: float = Field(1.0, ge=0.1, le=5.0)

class SimulationOutput(BaseModel):
    is_simulated: bool = True
    notice: str = "ARTIFICIALLY GENERATED SIMULATION DATA - NOT ACTUAL SENSOR SAMPLES"
    config: SimulationConfig
    signal_preview: List[float]
    time_axis: List[float]
    defect_frequencies: Dict[str, float]
    summary_features: Dict[str, float]
    sample_count: int
    rms: float
    peak: float
