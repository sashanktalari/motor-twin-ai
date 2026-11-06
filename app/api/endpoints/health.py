from fastapi import APIRouter
from app.schemas.common import HealthCheckResponse
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthCheckResponse)
def get_health():
    rf_exists = (settings.MODELS_DIR / "rf_model.joblib").exists()
    return HealthCheckResponse(
        status="operational",
        version="1.0.0",
        project="MOTOR TWIN AI",
        models_loaded=rf_exists,
        database_connected=True
    )
