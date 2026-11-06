from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.database.models import DiagnosisRecord, SimulationRecord
from app.schemas.digital_twin import DigitalTwinState, MotorTelemetry
from app.core.config import settings
import datetime

router = APIRouter()

@router.get("/state", response_model=DigitalTwinState)
def get_digital_twin_state(db: Session = Depends(get_db)):
    """
    Returns dynamic virtual state synchronized with the latest diagnosis assessment
    or active simulation.
    """
    if not isinstance(db, Session):
        with SessionLocal() as session:
            latest_diag = session.query(DiagnosisRecord).order_by(DiagnosisRecord.timestamp.desc()).first()
            latest_sim = session.query(SimulationRecord).order_by(SimulationRecord.timestamp.desc()).first()
    else:
        latest_diag = db.query(DiagnosisRecord).order_by(DiagnosisRecord.timestamp.desc()).first()
        latest_sim = db.query(SimulationRecord).order_by(SimulationRecord.timestamp.desc()).first()

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if latest_diag:
        fault_type = latest_diag.predicted_fault
        health = float(latest_diag.health_score)
        conf = float(latest_diag.confidence)
        rms = float(latest_diag.rms_vibration) if latest_diag.rms_vibration else 0.082
        peak = float(latest_diag.peak_vibration) if latest_diag.peak_vibration else 0.245
        rpm = float(latest_diag.rotational_speed_rpm) if latest_diag.rotational_speed_rpm else 1797.0
        load_hp = float(latest_diag.operating_load_hp) if latest_diag.operating_load_hp else 1.0
        source = latest_diag.source_type

        # Determine severity and status
        if fault_type == "Normal":
            status = "NORMAL"
            severity = "NONE"
            de_health = min(100.0, max(85.0, health))
            temp_c = 48.0 + (load_hp * 4.2)
        else:
            if conf > 0.85 or rms > 0.35:
                status = "FAULT"
                severity = "CRITICAL"
                de_health = max(15.0, health)
                temp_c = 68.0 + (load_hp * 6.5)
            else:
                status = "WARNING"
                severity = "MODERATE"
                de_health = max(45.0, health)
                temp_c = 58.0 + (load_hp * 5.0)

        # Electrical approximations for 2HP induction motor at given load
        voltage = 460.0
        current = round(1.2 + (load_hp / 2.0) * 1.8, 2)
        pf = round(0.72 + (load_hp / 2.0) * 0.16, 2)

        telemetry = MotorTelemetry(
            rpm=rpm,
            load_hp=load_hp,
            voltage_v=voltage,
            current_a=current,
            frequency_hz=60.0,
            power_factor=pf,
            vibration_rms_g=round(rms, 4),
            peak_vibration_g=round(peak, 4),
            temperature_c=round(temp_c, 1),
            health_score=round(health, 1),
            status=status,
            fault_type=fault_type,
            fault_severity=severity,
            data_source=source,
            last_updated=latest_diag.timestamp.isoformat() if latest_diag.timestamp else now_iso
        )

        component_health = {
            "drive_end_bearing": round(de_health, 1),
            "fan_end_bearing": 98.2,
            "stator_windings": round(max(85.0, 100.0 - (temp_c - 40.0) * 0.5), 1),
            "rotor_bars": 99.0
        }

        operating_mode = "DATASET_TRACKING" if source == "DATASET" else "SIMULATION_SYNC"

    else:
        # Awaiting first assessment: nominal baseline representation
        telemetry = MotorTelemetry(
            rpm=1797.0,
            load_hp=1.0,
            voltage_v=460.0,
            current_a=2.2,
            frequency_hz=60.0,
            power_factor=0.84,
            vibration_rms_g=0.045,
            peak_vibration_g=0.12,
            temperature_c=45.0,
            health_score=100.0,
            status="NORMAL",
            fault_type="Normal (Baseline)",
            fault_severity="NONE",
            data_source="BASELINE_REFERENCE",
            last_updated=now_iso
        )
        component_health = {
            "drive_end_bearing": 100.0,
            "fan_end_bearing": 100.0,
            "stator_windings": 100.0,
            "rotor_bars": 100.0
        }
        operating_mode = "NOMINAL_STANDBY"

    return DigitalTwinState(
        telemetry=telemetry,
        component_health=component_health,
        operating_mode=operating_mode,
        disclaimer="Virtual Representation Synchronized with Selected Signal & ML Inference (Not an FEA/Electromagnetic Solver)"
    )
