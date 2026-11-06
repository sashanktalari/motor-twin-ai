# RESTful API Documentation — MOTOR TWIN AI

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI Explorer (Swagger UI): `http://localhost:8000/api/docs`  
ReDoc Documentation: `http://localhost:8000/api/redoc`

---

## 1. System Health & Infrastructure

### `GET /api/health`
Checks backend service availability and machine learning model artifact readiness.

**Response (200 OK):**
```json
{
  "status": "operational",
  "project": "MOTOR TWIN AI",
  "version": "1.0.0",
  "models_loaded": true,
  "database_connected": true,
  "timestamp": "2026-11-02T09:05:37Z"
}
```

---

## 2. Overview Dashboard

### `GET /api/dashboard/summary`
Returns high-level motor health metrics, recent diagnostic events, and fault distribution. When no diagnosis has been performed, returns an honest unassessed standby state.

**Response (200 OK):**
```json
{
  "has_data": true,
  "overall_health_score": 92.4,
  "health_status_label": "HEALTHY",
  "current_operating_condition": "1797 RPM, 1.0 HP Load",
  "predicted_fault": "Normal",
  "fault_probability": 0.985,
  "vibration_rms": 0.052,
  "peak_vibration": 0.141,
  "rotational_speed_rpm": 1797.0,
  "selected_dataset": "CWRU Normal Baseline (0 HP)",
  "data_source_mode": "BENCHMARK_DATASET",
  "total_assessments": 14,
  "fault_distribution": {
    "Normal": 8,
    "Inner Race Fault": 2,
    "Ball Fault": 2,
    "Outer Race Fault": 2
  },
  "recent_history": [...],
  "status_message": "Motor operating within normal ISO 10816 Class II vibration tolerances."
}
```

---

## 3. Digital Twin Synchronization

### `GET /api/digital-twin/state`
Supplies real-time physical telemetry, component-level health scores, and operating parameters to drive the Three.js 3D induction motor model.

**Response (200 OK):**
```json
{
  "telemetry": {
    "rpm": 1797.0,
    "load_hp": 1.0,
    "voltage_v": 460.0,
    "current_a": 2.8,
    "frequency_hz": 60.0,
    "power_factor": 0.85,
    "vibration_rms_g": 0.052,
    "peak_vibration_g": 0.141,
    "temperature_c": 44.5,
    "health_score": 92.4,
    "status": "NORMAL",
    "fault_type": "Normal",
    "fault_severity": "NONE",
    "data_source": "CWRU 12kHz Drive-End Accelerometer",
    "last_updated": "2026-11-02T09:05:37Z"
  },
  "component_health": {
    "drive_end_bearing": 95.0,
    "non_drive_end_bearing": 98.0,
    "stator_windings": 96.0,
    "rotor_and_shaft": 94.0,
    "cooling_fan": 99.0
  },
  "operating_mode": "DATASET_PLAYBACK",
  "disclaimer": "Digital twin state driven by physical CWRU benchmark telemetry and calibrated kinematics."
}
```

---

## 4. Dataset Explorer

### `GET /api/datasets`
Retrieves registered vibration datasets in the catalog.

### `GET /api/datasets/{id}`
Retrieves detailed metadata, signal preview (1000 points), calculated 17 features, and theoretical defect frequencies for a specific record.

### `POST /api/datasets/upload`
Uploads and validates a custom `.mat` or `.csv` vibration signal file.

### `DELETE /api/datasets/{id}`
Deletes a custom/uploaded dataset. Prevents deletion of core CWRU benchmark files (HTTP 403 Forbidden).

---

## 5. Fault Diagnosis Engine

### `POST /api/diagnosis/predict`
Executes real-time multi-class bearing fault classification using trained ML models on time- and frequency-domain vibration features.

**Request Body:**
```json
{
  "source_type": "DATASET",
  "dataset_id": 2,
  "sample_index": 2048,
  "sampling_rate_hz": 12000.0,
  "load_hp": 1.0,
  "model_name": "random_forest"
}
```
*Valid `model_name` values: `"random_forest"`, `"svm"`, `"knn"`.*

**Response (200 OK):**
```json
{
  "id": 15,
  "predicted_fault": "Inner Race Fault",
  "confidence": 0.942,
  "probabilities": {
    "Normal": 0.012,
    "Inner Race Fault": 0.942,
    "Ball Fault": 0.031,
    "Outer Race Fault": 0.015
  },
  "health_score": 38.5,
  "features": {
    "mean": -0.0012,
    "std": 0.2845,
    "variance": 0.0809,
    "rms": 0.2845,
    "peak_to_peak": 1.942,
    "skewness": -0.124,
    "kurtosis": 5.821,
    "peak": 0.985,
    "crest_factor": 3.462,
    "shape_factor": 1.341,
    "impulse_factor": 4.642,
    "dominant_frequency": 161.4,
    "spectral_centroid": 1240.5,
    "spectral_energy": 0.0412,
    "spectral_std": 642.1,
    "spectral_skewness": 1.84,
    "spectral_kurtosis": 7.12
  },
  "source_type": "DATASET",
  "severity": "CRITICAL",
  "anomaly_detected": true,
  "anomaly_score": -0.142,
  "timestamp": "2026-11-02T09:10:00Z",
  "model_used": "random_forest"
}
```

### `POST /api/diagnosis/analyze-signal`
Performs FFT decomposition and STFT spectrogram computation on raw signal arrays.

---

## 6. Motor Simulation

### `POST /api/simulation/start`
Generates synthetic mechanical vibration signals incorporating rotational harmonics, 60 Hz / 120 Hz electrical stator hum, and kinematic fault impact bursts.

**Request Body:**
```json
{
  "simulation_name": "Synthetic Ball Fault Inspection",
  "fault_type": "Ball Fault",
  "rpm": 1750.0,
  "load_hp": 1.0,
  "duration_seconds": 0.5,
  "sampling_rate_hz": 12000.0,
  "noise_level": 0.1,
  "amplitude_scaling": 1.0
}
```

---

## 7. Predictive Maintenance

### `POST /api/maintenance/analyze`
Evaluates degradation trends, computes Isolation Forest anomaly scores, and generates maintenance advisories with explicit academic RUL disclaimers.

---

## 8. Model Performance

### `GET /api/models/performance`
Returns scientific validation metrics (Accuracy, Macro Precision, Recall, Macro F1, and Confusion Matrices) across Random Forest, SVM, and KNN.

### `POST /api/models/train`
Triggers full retraining of all models using the leakage-free 75/25 chronological split.

---

## 9. Maintenance Reports

### `GET /api/reports`
Lists all archived maintenance audit reports.

### `POST /api/reports/generate`
Generates a formal ISO 10816 engineering audit report.

### `GET /api/reports/{id}`
Retrieves a specific report by ID.

### `DELETE /api/reports/{id}`
Deletes an archived maintenance report.
