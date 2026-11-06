import pytest
from app.schemas.simulation import SimulationConfig
from app.services.simulation_service import MotorSimulationEngine

def test_simulation_generation():
    cfg = SimulationConfig(
        fault_type="Inner Race Fault",
        rpm=1797.0,
        load_hp=1.0,
        duration_seconds=0.5,
        sampling_rate_hz=12000.0,
        noise_level=0.05,
        amplitude_scaling=1.0
    )
    res = MotorSimulationEngine.run_simulation(cfg)
    
    assert res["is_simulated"] is True
    assert "SIMULATED DATA" in res["notice"]
    assert len(res["signal_preview"]) > 0
    assert len(res["spectrum_frequencies"]) > 0
    assert res["rms"] > 0
    assert res["peak"] > 0
    assert res["defect_frequencies"]["bpfi_hz"] > 0
