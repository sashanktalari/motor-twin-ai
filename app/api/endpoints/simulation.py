from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import SimulationRecord
from app.schemas.simulation import SimulationConfig
from app.services.simulation_service import MotorSimulationEngine
from app.core.logging import logger
import datetime

router = APIRouter()

current_simulation_status = {
    "status": "READY",
    "last_run": None,
    "last_config": None
}

@router.post("/start")
def start_simulation(config: SimulationConfig, db: Session = Depends(get_db)):
    """
    Executes a software-only motor vibration simulation using physics-based harmonic
    and bearing defect impact impulse models.
    All outputs are explicitly labeled as SIMULATED DATA.
    """
    try:
        result = MotorSimulationEngine.run_simulation(config)
        
        # Record run in database
        sim_rec = SimulationRecord(
            simulation_name=f"Sim-{config.fault_type}-{int(config.rpm)}RPM",
            fault_type=config.fault_type,
            rpm=config.rpm,
            load_hp=config.load_hp,
            duration_seconds=config.duration_seconds,
            sampling_rate_hz=config.sampling_rate_hz,
            noise_level=config.noise_level,
            amplitude_scaling=config.amplitude_scaling,
            result_summary={
                "rms": result["rms"],
                "peak": result["peak"],
                "kurtosis": result["kurtosis"],
                "dominant_freq": result["dominant_frequency"]
            }
        )
        db.add(sim_rec)
        db.commit()

        current_simulation_status["status"] = "COMPLETED"
        current_simulation_status["last_run"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        current_simulation_status["last_config"] = config.model_dump()

        return result
    except Exception as e:
        db.rollback()
        logger.error(f"Error executing motor simulation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation failure: {str(e)}")

@router.get("/status")
def get_simulation_status():
    return {
        "status": current_simulation_status["status"],
        "last_run": current_simulation_status["last_run"],
        "last_config": current_simulation_status["last_config"],
        "notice": "SIMULATED DATA ENGINE — Physics-based mathematical generator."
    }

@router.post("/stop")
def stop_simulation():
    current_simulation_status["status"] = "STOPPED"
    return {"status": "STOPPED", "message": "Simulation halted."}
