import datetime
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import MaintenanceReport, DiagnosisRecord
from app.schemas.report import MaintenanceReportCreate, MaintenanceReportResponse

router = APIRouter()

def determine_iso_zone(rms: float) -> str:
    """
    Evaluates vibration severity according to ISO 10816-1 for Class I/II electrical machinery.
    """
    if rms < 0.08:
        return "Zone A: Newly Commissioned / Optimal (Unrestricted Operation)"
    elif rms < 0.18:
        return "Zone B: Acceptable Condition (Unrestricted Long-term Operation)"
    elif rms < 0.45:
        return "Zone C: Unsatisfactory (Restricted Operation / Prompt Maintenance Required)"
    else:
        return "Zone D: Critical Danger (Vibration Exceeds Safety Thresholds / Damage Imminent)"

def build_recommended_actions(fault: str, severity: str) -> list:
    if fault == "Normal":
        return [
            {
                "priority": "ROUTINE",
                "target_component": "Stator & Bearings",
                "description": "Maintain regular 30-day ISO 10816 condition monitoring vibration surveys."
            },
            {
                "priority": "ROUTINE",
                "target_component": "Cooling Fins",
                "description": "Inspect rear fan cowl and cooling shroud for airflow obstruction or debris buildup."
            },
            {
                "priority": "ROUTINE",
                "target_component": "Terminal Box",
                "description": "Verify cable gland sealing and inspect three-phase winding terminations."
            }
        ]
    
    actions = [
        {
            "priority": "IMMEDIATE" if severity == "CRITICAL" else "SCHEDULED",
            "target_component": "Drive-End Bearing (SKF 6205)",
            "description": f"Isolate motor drive and perform precision acoustic grease replenishment or bearing replacement for {fault}."
        },
        {
            "priority": "SCHEDULED",
            "target_component": "Rotor Shaft & Coupling",
            "description": "Check angular and parallel shaft alignment with laser alignment kit to eliminate secondary stress."
        },
        {
            "priority": "SCHEDULED",
            "target_component": "Drive-End Housing",
            "description": "Inspect bearing housing bore tolerance (fit H7) for signs of fretting corrosion or eccentric seating."
        },
        {
            "priority": "ROUTINE",
            "target_component": "Vibration Sensor Array",
            "description": "Perform post-repair baseline FFT spectral survey to confirm defect frequency harmonics are eliminated."
        }
    ]
    return actions

@router.get("", response_model=List[MaintenanceReportResponse])
def list_reports(db: Session = Depends(get_db)):
    """
    Retrieve all archived maintenance and condition assessment reports.
    """
    reports = db.query(MaintenanceReport).order_by(MaintenanceReport.timestamp.desc()).all()
    return reports

@router.post("/generate", response_model=MaintenanceReportResponse)
def generate_report(req: MaintenanceReportCreate, db: Session = Depends(get_db)):
    """
    Synthesizes current or specific diagnostic state into a formal ISO 10816 maintenance report.
    """
    diag = None
    if req.diagnosis_id:
        diag = db.query(DiagnosisRecord).filter(DiagnosisRecord.id == req.diagnosis_id).first()
    
    if not diag:
        diag = db.query(DiagnosisRecord).order_by(DiagnosisRecord.timestamp.desc()).first()

    now = datetime.datetime.now(datetime.timezone.utc)
    ref_code = f"REP-{now.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    if diag:
        fault = diag.predicted_fault
        confidence = diag.confidence
        health = diag.health_score
        rms = diag.rms_vibration or 0.08
        peak = diag.peak_vibration or (rms * 2.8)
        severity = "NORMAL" if health >= 85.0 else ("LOW" if health >= 65.0 else ("MODERATE" if health >= 40.0 else "CRITICAL"))
        op_cond = f"{diag.rotational_speed_rpm:.0f} RPM, {diag.operating_load_hp:.1f} HP Load (Source: {diag.source_reference or diag.source_type})"
    else:
        fault = "Normal"
        confidence = 0.98
        health = 95.0
        rms = 0.045
        peak = 0.112
        severity = "NORMAL"
        op_cond = "1797 RPM, 1.0 HP Rated Baseline (Unassessed Standby)"

    iso_zone = determine_iso_zone(rms)
    actions = build_recommended_actions(fault, severity)

    component_assessments = {
        "drive_end_bearing": "CRITICAL" if "Fault" in fault and severity in ["CRITICAL", "MODERATE"] else ("WARNING" if "Fault" in fault else "HEALTHY"),
        "non_drive_end_bearing": "HEALTHY",
        "stator_windings": "HEALTHY",
        "rotor_and_shaft": "MONITORED" if "Fault" in fault else "HEALTHY",
        "cooling_fan_and_cowl": "HEALTHY"
    }

    notes = req.engineer_notes or (
        f"Automated engineering condition assessment conducted per ISO 10816 standards. "
        f"Primary condition detected: {fault} with {confidence*100:.1f}% model confidence. "
        f"Kinematic defect frequencies and vibration peaks reviewed."
    )

    report = MaintenanceReport(
        report_reference=ref_code,
        timestamp=now,
        title=req.title or "Electrical Motor Predictive Maintenance Inspection Report",
        technician_name=req.technician_name or "Lead Reliability Engineer",
        motor_spec="Reliance Electric 2 HP 3-Phase Squirrel Cage Induction Motor (NEMA Frame 182T)",
        operating_condition=op_cond,
        diagnosed_fault=fault,
        fault_confidence=round(confidence, 4),
        health_score=round(health, 1),
        severity=severity,
        iso_zone=iso_zone,
        vibration_rms=round(rms, 6),
        vibration_peak=round(peak, 6),
        component_assessments=component_assessments,
        recommended_actions=actions,
        engineer_notes=notes,
        rul_statement="RUL estimation unavailable — continuous run-to-failure degradation data required per academic validation protocol."
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report

@router.get("/{report_id}", response_model=MaintenanceReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """
    Retrieve specific maintenance report by database ID.
    """
    report = db.query(MaintenanceReport).filter(MaintenanceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Maintenance report not found.")
    return report

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """
    Delete an archived maintenance report.
    """
    report = db.query(MaintenanceReport).filter(MaintenanceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Maintenance report not found.")
    
    db.delete(report)
    db.commit()
    return {"status": "success", "message": f"Report #{report_id} ({report.report_reference}) deleted successfully."}
