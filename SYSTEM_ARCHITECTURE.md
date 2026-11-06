# System Architecture — MOTOR TWIN AI

## 1. Architectural Topology

**MOTOR TWIN AI** employs a decoupled client-server architecture designed for high maintainability, clear separation of concerns, and reproducible scientific execution:

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                 React 18 + TypeScript + Vite Single Page App                 |  |
|  |                                                                             |  |
|  |  +--------------------+  +--------------------+  +-----------------------+  |  |
|  |  |   Three.js / R3F   |  |   Recharts Engine  |  |   10 Feature Pages    |  |  |
|  |  |  3D Induction Motor|  |  FFT & Telemetry   |  |  Overview, Twin, etc. |  |  |
|  |  +--------------------+  +--------------------+  +-----------------------+  |  |
|  |                                |                                            |  |
|  |                    Typed API Client (Fetch Client)                          |  |
|  +--------------------------------|--------------------------------------------+  |
+-----------------------------------|-----------------------------------------------+
                                    | HTTP / JSON (RESTful)
                                    v
+-----------------------------------------------------------------------------------+
|                              FASTAPI BACKEND (Python)                             |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                         API Router Layer (FastAPI)                          |  |
|  |  /health | /dashboard | /datasets | /diagnosis | /digital-twin | /simulation  |  |
|  |  /maintenance | /models | /reports                                          |  |
|  +-----------------------------------------------------------------------------+  |
|                                    |                                              |
|         +--------------------------+--------------------------+                   |
|         |                                                     |                   |
|         v                                                     v                   |
|  +-------------------------------+             +-------------------------------+  |
|  |       Scientific Services     |             |      Machine Learning Hub     |  |
|  |  - SignalProcessor (FFT,STFT) |             |  - ModelManager (Singleton)   |  |
|  |  - Kinematic Defect Freqs     |             |  - MLFeatureExtractor (17-dim)|  |
|  |  - SimulationEngine (Physics) |             |  - Random Forest (100 Trees)  |  |
|  |  - DatasetService (.mat/.csv) |             |  - Support Vector Machine RBF |  |
|  |  - ISO 10816 Health Scorer    |             |  - KNN (k=5 Distance-Weighted)|  |
|  +-------------------------------+             |  - Isolation Forest (Anomaly) |  |
|                 |                              +-------------------------------+  |
|                 |                                             |                   |
|                 +----------------------+----------------------+                   |
|                                        |                                          |
|                                        v                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                            Data Persistence Layer                           |  |
|  |  - SQLAlchemy ORM                                                           |  |
|  |  - SQLite Database (`motor_twin.db`)                                        |  |
|  |  - Raw Files: `datasets/raw/` (.mat, .csv)                                  |  |
|  |  - Serialized Models: `models/*.joblib`, `models/metrics.json`              |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Subsystems

### 2.1 Frontend Subsystem (`frontend/src/`)
- **Technology:** React 18, TypeScript 5, Vite, Tailwind CSS 3, Three.js, Recharts, Lucide Icons.
- **State Management:** Reactive local state with API polling synchronizer.
- **3D Visualization:** `Motor3DViewer.tsx` implements:
  - Three.js WebGL canvas with custom OrbitControls.
  - Procedurally constructed induction motor geometry (Stator, 16 individual cooling fins, front & rear end-shields, mounting feet with bolts, circular top-mounted terminal box, shaft coupling, output shaft, bearing housings, and cooling fan cowl).
  - PBR materials: Metallic roughness, directional key/fill lights, ambient light, and drop shadow plane.
  - Three camera viewing presets: Isometric, Front, Side, Top, and Default Reset.
  - Three visualization modes: Solid industrial paint, Thermal heatmap, and Wireframe inspection.
  - Raycaster-based interactive component inspection (click to inspect individual motor parts).
  - Dynamic RPM-driven continuous shaft and fan rotation animation loop (`requestAnimationFrame`).

### 2.2 Backend Subsystem (`backend/app/`)
- **Technology:** Python 3.13, FastAPI, Pydantic v2, SQLAlchemy, NumPy, SciPy, Scikit-learn.
- **Core Endpoints:**
  - `health.py`: Evaluates system and ML artifact readiness.
  - `dashboard.py`: Honest unassessed vs. assessed motor overview.
  - `digital_twin.py`: Returns synchronized telemetry, operational state, and component health.
  - `datasets.py`: Handles CWRU benchmark catalogue, preview signals, and file ingestion/deletion.
  - `diagnosis.py`: Computes 17 features, performs ML multi-class inference, and records diagnostic logs.
  - `simulation.py`: Physics-based parametric synthetic vibration synthesis.
  - `maintenance.py`: Isolation Forest anomaly scoring and condition advisory.
  - `models_perf.py`: Leak-free empirical evaluation report across RF, SVM, and KNN.
  - `reports.py`: Generation, listing, and deletion of ISO 10816 maintenance audit certificates.

### 2.3 Machine Learning Subsystem (`backend/app/ml/`)
- **`feature_extractor.py`**: Extracts a canonical 17-element feature vector:
  - Time domain: `mean`, `std`, `variance`, `rms`, `peak_to_peak`, `skewness`, `kurtosis`, `peak`, `crest_factor`, `shape_factor`, `impulse_factor`.
  - Frequency domain: `dominant_frequency`, `spectral_centroid`, `spectral_energy`, `spectral_std`, `spectral_skewness`, `spectral_kurtosis`.
- **`model_manager.py`**: In-memory singleton caching loaded estimators (`rf_model.joblib`, `svm_model.joblib`, `knn_model.joblib`, `isolation_forest.joblib`, and `scaler.joblib`).
- **`train.py`**: Executes leak-free training with chronological recording partition (75% train / 25% test), generates per-class precision, recall, F1, and confusion matrices, and writes `metrics.json`.

---

## 3. Database Schema

The persistence layer uses SQLite via SQLAlchemy ORM with four primary tables:

1. **`diagnosis_records`**:
   - `id`: Integer PK
   - `timestamp`: DateTime (UTC)
   - `source_type`: String ("DATASET", "SIMULATION", "UPLOAD")
   - `source_reference`: String (e.g., file name or simulation ID)
   - `predicted_fault`: String ("Normal", "Inner Race Fault", "Ball Fault", "Outer Race Fault")
   - `confidence`: Float
   - `probabilities`: JSON (dictionary of class probabilities)
   - `health_score`: Float [0..100]
   - `rms_vibration`: Float
   - `peak_vibration`: Float
   - `dominant_frequency`: Float
   - `features`: JSON (17 extracted features)
   - `operating_load_hp`: Float
   - `rotational_speed_rpm`: Float

2. **`simulation_records`**:
   - `id`: Integer PK
   - `timestamp`: DateTime (UTC)
   - `simulation_name`: String
   - `fault_type`: String
   - `rpm`: Float
   - `load_hp`: Float
   - `duration_seconds`: Float
   - `sampling_rate_hz`: Float
   - `noise_level`: Float
   - `amplitude_scaling`: Float
   - `result_summary`: JSON

3. **`maintenance_logs`**:
   - `id`: Integer PK
   - `timestamp`: DateTime (UTC)
   - `fault_detected`: String
   - `severity`: String ("NORMAL", "LOW", "MODERATE", "CRITICAL")
   - `health_score`: Float
   - `recommended_action`: Text
   - `status`: String ("PENDING", "RESOLVED")
   - `action_priority`: Integer (1=Highest, 4=Lowest)

4. **`dataset_records`**:
   - `id`: Integer PK
   - `created_at`: DateTime (UTC)
   - `name`: String
   - `filename`: String
   - `file_type`: String ("MAT", "CSV")
   - `sampling_rate_hz`: Float
   - `fault_class`: String
   - `motor_load_hp`: Float
   - `sample_count`: Integer
   - `duration_seconds`: Float
   - `is_benchmark`: Integer (1 for core CWRU files)

5. **`maintenance_reports`**:
   - `id`: Integer PK
   - `report_reference`: String (Unique e.g. `REP-20261102-1402`)
   - `timestamp`: DateTime (UTC)
   - `title`: String
   - `technician_name`: String
   - `motor_spec`: String
   - `operating_condition`: String
   - `diagnosed_fault`: String
   - `fault_confidence`: Float
   - `health_score`: Float
   - `severity`: String
   - `iso_zone`: String
   - `vibration_rms`: Float
   - `vibration_peak`: Float
   - `component_assessments`: JSON
   - `recommended_actions`: JSON (list of action items)
   - `engineer_notes`: Text
   - `rul_statement`: String
