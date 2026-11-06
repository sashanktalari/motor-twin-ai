import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "MOTOR TWIN AI"
    PROJECT_TITLE: str = "Design and Development of a Predictive Digital Twin for Electrical Motor Fault Diagnosis and Maintenance"
    PROJECT_SUBTITLE: str = "Intelligent Electrical Motor Monitoring & Predictive Maintenance Platform"
    API_V1_STR: str = "/api"
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATASETS_DIR: Path = PROJECT_ROOT / "datasets"
    RAW_DATASETS_DIR: Path = PROJECT_ROOT / "datasets" / "raw"
    PROCESSED_DATASETS_DIR: Path = PROJECT_ROOT / "datasets" / "processed"
    MODELS_DIR: Path = PROJECT_ROOT / "models"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/motor_twin.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Motor default electrical/mechanical parameters (CWRU testbed 2HP Reliance Electric motor)
    DEFAULT_RATED_RPM: float = 1797.0
    DEFAULT_RATED_POWER_HP: float = 2.0
    DEFAULT_BEARING_TYPE: str = "SKF 6205-2RS JEM Deep Groove Ball Bearing"
    DEFAULT_BEARING_PITCH_DIAMETER_MM: float = 39.04
    DEFAULT_BEARING_BALL_DIAMETER_MM: float = 7.94
    DEFAULT_BEARING_NUM_BALLS: int = 9
    DEFAULT_CONTACT_ANGLE_DEG: float = 0.0

settings = Settings()
