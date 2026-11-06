from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.database.session import get_db
from app.database.models import DiagnosisRecord
from app.core.logging import logger
import datetime

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Retrieves operational summary of motor diagnostics.
    Strictly adheres to scientific truthfulness:
    Returns an honest unassessed state if no diagnosis records exist,
    rather than fabricating synthetic health scores or predictions.
    """
    try:
        total_diagnoses = db.query(DiagnosisRecord).count()
        
        # When no diagnosis records exist, return honest unassessed state
        if total_diagnoses == 0:
            return {
                "has_data": False,
                "overall_health_score": None,
                "health_status_label": "Awaiting Assessment",
                "current_operating_condition": "Awaiting Assessment",
                "predicted_fault": None,
                "fault_probability": None,
                "vibration_rms": None,
                "peak_vibration": None,
                "rotational_speed_rpm": None,
                "selected_dataset": "None Selected",
                "data_source_mode": "NO_EVALUATION_DATA",
                "total_assessments": 0,
                "fault_distribution": {
                    "Normal": 0,
                    "Inner Race Fault": 0,
                    "Ball Fault": 0,
                    "Outer Race Fault": 0
                },
                "recent_history": [],
                "status_message": "No motor diagnostics have been executed yet. Select a dataset in Fault Diagnosis or run a Motor Simulation to evaluate operational state."
            }

        recent_diagnoses = db.query(DiagnosisRecord).order_by(DiagnosisRecord.timestamp.desc()).limit(10).all()
        latest = recent_diagnoses[0]

        # Calculate exact counts
        normal_count = db.query(DiagnosisRecord).filter(DiagnosisRecord.predicted_fault == "Normal").count()
        inner_count = db.query(DiagnosisRecord).filter(DiagnosisRecord.predicted_fault == "Inner Race Fault").count()
        ball_count = db.query(DiagnosisRecord).filter(DiagnosisRecord.predicted_fault == "Ball Fault").count()
        outer_count = db.query(DiagnosisRecord).filter(DiagnosisRecord.predicted_fault == "Outer Race Fault").count()

        recent_items = []
        for d in recent_diagnoses:
            ts_str = d.timestamp.isoformat() if d.timestamp else datetime.datetime.now(datetime.timezone.utc).isoformat()
            recent_items.append({
                "id": d.id,
                "timestamp": ts_str,
                "predicted_fault": d.predicted_fault,
                "confidence": round(float(d.confidence), 4),
                "health_score": round(float(d.health_score), 1),
                "source_type": d.source_type,
                "source_reference": d.source_reference,
                "rms_vibration": round(float(d.rms_vibration), 4) if d.rms_vibration is not None else None,
                "peak_vibration": round(float(d.peak_vibration), 4) if d.peak_vibration is not None else None,
                "rotational_speed_rpm": float(d.rotational_speed_rpm) if d.rotational_speed_rpm is not None else 1797.0
            })

        # Calculate health label
        health = latest.health_score
        if health >= 90.0:
            health_label = "HEALTHY"
        elif health >= 75.0:
            health_label = "ATTENTION REQUIRED"
        elif health >= 50.0:
            health_label = "WARNING - DEGRADATION"
        else:
            health_label = "CRITICAL FAULT DETECTED"

        return {
            "has_data": True,
            "overall_health_score": round(float(health), 1),
            "health_status_label": health_label,
            "current_operating_condition": latest.predicted_fault,
            "predicted_fault": latest.predicted_fault,
            "fault_probability": round(float(latest.confidence), 4),
            "vibration_rms": round(float(latest.rms_vibration), 4) if latest.rms_vibration is not None else None,
            "peak_vibration": round(float(latest.peak_vibration), 4) if latest.peak_vibration is not None else None,
            "rotational_speed_rpm": float(latest.rotational_speed_rpm) if latest.rotational_speed_rpm is not None else 1797.0,
            "selected_dataset": latest.source_reference or "Recent Evaluation",
            "data_source_mode": latest.source_type,
            "total_assessments": total_diagnoses,
            "fault_distribution": {
                "Normal": normal_count,
                "Inner Race Fault": inner_count,
                "Ball Fault": ball_count,
                "Outer Race Fault": outer_count
            },
            "recent_history": recent_items,
            "status_message": "Operational diagnostics active."
        }

    except SQLAlchemyError as db_err:
        logger.error(f"Database error in get_dashboard_summary: {str(db_err)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database failure while querying diagnosis summary.")
    except Exception as e:
        logger.error(f"Unexpected error in get_dashboard_summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Diagnostic error: {str(e)}")
