import pytest
from app.database.session import SessionLocal
from app.api.endpoints.health import get_health
from app.api.endpoints.dashboard import get_dashboard_summary
from app.api.endpoints.datasets import list_datasets, get_dataset_detail
from app.api.endpoints.diagnosis import predict_fault, analyze_signal, get_diagnosis_history
from app.api.endpoints.digital_twin import get_digital_twin_state
from app.api.endpoints.simulation import start_simulation, get_simulation_status
from app.api.endpoints.maintenance import analyze_maintenance, get_maintenance_history
from app.api.endpoints.models_perf import list_models, get_models_performance
from app.api.endpoints.reports import list_reports, generate_report, get_report, delete_report
from app.api.endpoints.datasets import delete_dataset
from app.schemas.diagnosis import PredictionRequest, SignalAnalysisRequest
from app.schemas.simulation import SimulationConfig
from app.schemas.report import MaintenanceReportCreate
from app.database.models import DatasetRecord
from fastapi import HTTPException

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_api_health():
    res = get_health()
    assert res.status == "operational"
    assert res.models_loaded is True

def test_api_datasets(db_session):
    datasets = list_datasets(db=db_session)
    assert len(datasets) >= 4  # 4 CWRU benchmark files seeded
    first_id = datasets[0]["id"]
    detail = get_dataset_detail(first_id, db=db_session)
    assert len(detail["preview_signal"]) > 0
    assert "rms" in detail["summary_features"]

def test_api_predict_and_dashboard(db_session):
    datasets = list_datasets(db=db_session)
    target_ds = datasets[0]
    
    # Run prediction on dataset
    req = PredictionRequest(
        source_type="DATASET",
        dataset_id=target_ds["id"],
        sample_index=0,
        model_name="random_forest"
    )
    pred_res = predict_fault(req, db=db_session)
    assert "predicted_fault" in pred_res
    assert pred_res["confidence"] > 0
    
    # Check dashboard now reflects the assessment
    summary = get_dashboard_summary(db=db_session)
    assert summary["has_data"] is True
    assert summary["overall_health_score"] is not None
    assert summary["total_assessments"] >= 1
    assert len(summary["recent_history"]) >= 1

def test_api_analyze_signal():
    import numpy as np
    sig = list(np.sin(np.linspace(0, 10, 500)))
    req = SignalAnalysisRequest(signal=sig, sampling_rate_hz=12000.0, include_spectrogram=True)
    res = analyze_signal(req)
    assert len(res["frequencies"]) > 0
    assert len(res["time_series_preview"]) > 0
    assert res["spectrogram"] is not None

def test_api_simulation_and_digital_twin(db_session):
    cfg = SimulationConfig(fault_type="Ball Fault", rpm=1750.0, duration_seconds=0.3)
    sim_res = start_simulation(cfg, db=db_session)
    assert sim_res["is_simulated"] is True
    
    # Check digital twin state
    dt_state = get_digital_twin_state(db=db_session)
    assert dt_state.telemetry.rpm > 0
    assert "drive_end_bearing" in dt_state.component_health

def test_api_maintenance_and_models(db_session):
    maint = analyze_maintenance(db=db_session)
    assert "RUL estimation unavailable" in maint["rul_notice"]
    assert len(maint["recommended_actions"]) > 0
    
    models = list_models()
    assert len(models) == 3
    perf = get_models_performance()
    assert perf["is_trained"] is True
    assert len(perf["models"]) == 3
    model_names = [m["model_name"] for m in perf["models"]]
    assert "knn" in model_names

def test_api_maintenance_reports(db_session):
    # 1. Generate a report
    req = MaintenanceReportCreate(
        title="Field Vibration Inspection Test",
        technician_name="Senior Reliability Analyst",
        engineer_notes="Automated unit test baseline generation"
    )
    rep = generate_report(req, db=db_session)
    assert rep.id is not None
    assert rep.report_reference.startswith("REP-")
    assert "Reliance Electric" in rep.motor_spec
    assert "Zone" in rep.iso_zone
    assert len(rep.recommended_actions) > 0

    # 2. List reports
    all_reps = list_reports(db=db_session)
    assert len(all_reps) >= 1
    assert any(r.id == rep.id for r in all_reps)

    # 3. Get single report
    fetched = get_report(rep.id, db=db_session)
    assert fetched.id == rep.id
    assert fetched.title == "Field Vibration Inspection Test"

    # 4. Delete report
    del_res = delete_report(rep.id, db=db_session)
    assert del_res["status"] == "success"

def test_api_dataset_delete_guard(db_session):
    # Core benchmark record cannot be deleted
    bench = db_session.query(DatasetRecord).filter(DatasetRecord.is_benchmark == 1).first()
    assert bench is not None
    with pytest.raises(HTTPException) as exc_info:
        delete_dataset(bench.id, db=db_session)
    assert exc_info.value.status_code == 403

    # Uploaded/Custom record can be deleted
    custom_record = DatasetRecord(
        name="Temporary Test Signal",
        filename="temp_test_sig.csv",
        file_type="CSV",
        sampling_rate_hz=12000.0,
        fault_class="Normal",
        motor_load_hp=0.0,
        sample_count=1000,
        duration_seconds=0.08,
        is_benchmark=0
    )
    db_session.add(custom_record)
    db_session.commit()
    db_session.refresh(custom_record)

    del_res = delete_dataset(custom_record.id, db=db_session)
    assert del_res["status"] == "success"
