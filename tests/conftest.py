import pytest
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import Base, engine, SessionLocal
from app.database.models import DiagnosisRecord, MaintenanceLog, SimulationRecord, DatasetRecord
from app.database.seed import seed_database
from app.ml.model_manager import model_manager

# Ensure all database tables exist and are seeded for testing
Base.metadata.create_all(bind=engine)
seed_database()
model_manager.load_models()
