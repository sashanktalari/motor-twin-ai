import pytest
from app.api.endpoints.health import get_health
from app.api.endpoints.dashboard import get_dashboard_summary
from app.api.endpoints.digital_twin import get_digital_twin_state
from app.api.endpoints.models_perf import get_models_performance
from app.database.session import SessionLocal

def test_health_endpoint():
    res = get_health()
    assert res.status == "operational"
    assert res.project == "MOTOR TWIN AI"
    assert res.database_connected is True

def test_dashboard_summary_endpoint():
    db = SessionLocal()
    try:
        data = get_dashboard_summary(db=db)
        assert "overall_health_score" in data
        assert "current_operating_condition" in data
        assert "fault_distribution" in data
        assert isinstance(data["recent_history"], list)
    finally:
        db.close()

def test_digital_twin_state_endpoint():
    state = get_digital_twin_state()
    assert state.telemetry.rpm > 0
    assert state.telemetry.status in ["NORMAL", "WARNING", "FAULT"]
    assert "drive_end_bearing" in state.component_health

def test_models_performance_endpoint():
    perf = get_models_performance()
    assert "is_trained" in perf
    if perf["is_trained"]:
        assert len(perf["models"]) >= 2
        assert "random_forest" in [m["model_name"] for m in perf["models"]]
    else:
        assert "not trained yet" in perf["message"].lower()
