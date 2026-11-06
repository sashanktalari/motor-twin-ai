import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from app.database.session import Base

class DiagnosisRecord(Base):
    __tablename__ = "diagnosis_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    source_type = Column(String, default="DATASET")  # "DATASET", "SIMULATION", "UPLOAD"
    source_reference = Column(String, nullable=True)  # File name or simulation ID
    predicted_fault = Column(String, nullable=False)   # "Normal", "Inner Race Fault", "Ball Fault", "Outer Race Fault"
    confidence = Column(Float, nullable=False)
    probabilities = Column(JSON, nullable=True)        # {Normal: 0.05, Inner: 0.92, ...}
    health_score = Column(Float, nullable=False)
    rms_vibration = Column(Float, nullable=True)
    peak_vibration = Column(Float, nullable=True)
    dominant_frequency = Column(Float, nullable=True)
    features = Column(JSON, nullable=True)             # Statistical & spectral features
    operating_load_hp = Column(Float, default=0.0)
    rotational_speed_rpm = Column(Float, default=1797.0)

class SimulationRecord(Base):
    __tablename__ = "simulation_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    simulation_name = Column(String, nullable=False)
    fault_type = Column(String, nullable=False)
    rpm = Column(Float, default=1797.0)
    load_hp = Column(Float, default=1.0)
    duration_seconds = Column(Float, default=1.0)
    sampling_rate_hz = Column(Float, default=12000.0)
    noise_level = Column(Float, default=0.1)
    amplitude_scaling = Column(Float, default=1.0)
    result_summary = Column(JSON, nullable=True)

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    fault_detected = Column(String, nullable=False)
    severity = Column(String, nullable=False)         # "NORMAL", "LOW", "MODERATE", "CRITICAL"
    health_score = Column(Float, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String, default="PENDING")        # "PENDING", "INSPECTED", "RESOLVED"
    action_priority = Column(Integer, default=1)      # 1=Highest, 4=Lowest

class DatasetRecord(Base):
    __tablename__ = "dataset_records"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    name = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)        # "MAT", "CSV"
    sampling_rate_hz = Column(Float, default=12000.0)
    fault_class = Column(String, nullable=False)
    motor_load_hp = Column(Float, default=0.0)
    sample_count = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    is_benchmark = Column(Integer, default=0)         # 1 if official CWRU benchmark file

class MaintenanceReport(Base):
    __tablename__ = "maintenance_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_reference = Column(String, unique=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    title = Column(String, nullable=False)
    technician_name = Column(String, default="Lead Reliability Engineer")
    motor_spec = Column(String, default="Reliance Electric 2 HP 3-Phase Induction Motor (Frame 182T)")
    operating_condition = Column(String, default="1797 RPM, 1.0 HP Load")
    diagnosed_fault = Column(String, nullable=False)
    fault_confidence = Column(Float, nullable=False)
    health_score = Column(Float, nullable=False)
    severity = Column(String, nullable=False)
    iso_zone = Column(String, nullable=False)
    vibration_rms = Column(Float, nullable=False)
    vibration_peak = Column(Float, nullable=False)
    component_assessments = Column(JSON, nullable=True)
    recommended_actions = Column(JSON, nullable=False)
    engineer_notes = Column(Text, nullable=True)
    rul_statement = Column(String, default="RUL estimation unavailable — continuous run-to-failure degradation data required per academic validation protocol.")
