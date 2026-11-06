# MOTOR TWIN AI

## Design and Development of a Predictive Digital Twin for Electrical Motor Fault Diagnosis and Maintenance

**Subtitle:** Intelligent Electrical Motor Monitoring & Predictive Maintenance Platform  
**Target Domain:** Electrical & Electronics Engineering (EEE) + Artificial Intelligence & Machine Learning  
**Target Testbed:** Reliance Electric 2 HP 3-Phase Induction Motor (NEMA Frame 182T)  
**Reference Dataset:** Case Western Reserve University (CWRU) Bearing Data Center (SKF 6205-2RS JEM Deep Groove Ball Bearing)

---

## 1. Executive Overview

**MOTOR TWIN AI** is an academic-grade, software-only engineering platform that integrates physical induction motor kinematics, digital twin 3D visualization, signal processing, and machine learning for electrical motor fault diagnosis and predictive maintenance.

The platform provides a complete 10-module operational suite:
1. **Interactive 3D Digital Twin:** Real-time Three.js virtual induction motor with PBR materials, RPM-driven continuous shaft rotation, dynamic status heatmaps (Normal, Warning, Fault), solid/thermal/wireframe rendering modes, and click-to-inspect component diagnostics.
2. **Multi-Class ML Fault Diagnosis:** Supervised classification (Normal, Inner Race Fault, Ball Fault, Outer Race Fault) using Random Forest (100 trees), Support Vector Machine (RBF kernel), and K-Nearest Neighbors ($k=5$), trained on 17 classical time- and frequency-domain vibration descriptors.
3. **Signal Processing Laboratory:** Fast Fourier Transform (FFT) amplitude spectrum decomposition, defect kinematic frequency tracking ($f_r, f_{\text{BPFO}}, f_{\text{BPFI}}, f_{\text{BSF}}, f_{\text{FTF}}$), and Short-Time Fourier Transform (STFT) time-frequency spectrograms.
4. **Predictive Maintenance & Degradation Analytics:** Unsupervised anomaly scoring via Isolation Forest, ISO 10816 vibration severity indexing, and honest Remaining Useful Life (RUL) scientific advisory.
5. **Parametric Motor Simulation Engine:** Physics-based synthetic mechanical vibration synthesis with harmonic imbalance, stator line hum, and structural resonance defect impulse modeling.
6. **Dataset & Upload Manager:** Full inspection of CWRU benchmark recordings, custom MATLAB `.mat` and `.csv` uploads, signal feature extraction, and safe deletion.
7. **Model Performance Benchmark:** Leakage-free empirical evaluation comparing RF, SVM, and KNN with per-class precision, recall, macro F1, and confusion matrices.
8. **Maintenance Reports & Audit Sheets:** Printable ISO 10816-1 engineering compliance documents with reference serial numbers, component matrices, and remediation work orders.
9. **Overview Dashboard:** High-level motor health metrics, recent diagnostic events, and fault distribution charts.
10. **System Settings:** Operational health diagnostics, database record metrics, API connectivity check, and academic disclosures.

---

## 2. Comprehensive Documentation Suite

For detailed technical specifications, consult the dedicated guides in the [`docs/`](file:///d:/PROJECTS/motor-digital-twin/docs/) directory:

- [**Project Overview**](file:///d:/PROJECTS/motor-digital-twin/docs/PROJECT_OVERVIEW.md): Executive summary, domain scope, and academic principles.
- [**System Architecture**](file:///d:/PROJECTS/motor-digital-twin/docs/SYSTEM_ARCHITECTURE.md): Architectural topology, component subsystems, and SQLite database schema.
- [**Installation Guide**](file:///d:/PROJECTS/motor-digital-twin/docs/INSTALLATION.md): Step-by-step local setup, environment configuration, and cloud deployment instructions.
- [**API Documentation**](file:///d:/PROJECTS/motor-digital-twin/docs/API_DOCUMENTATION.md): Full RESTful API reference with request/response payloads.
- [**Dataset Information**](file:///d:/PROJECTS/motor-digital-twin/docs/DATASET_INFORMATION.md): CWRU testbed apparatus, SKF 6205 bearing kinematics, and defect frequency formulas.
- [**Machine Learning Methodology**](file:///d:/PROJECTS/motor-digital-twin/docs/MACHINE_LEARNING_METHODOLOGY.md): Mathematical definitions of 17 features, data leakage prevention, and model architectures.
- [**Testing & Verification Report**](file:///d:/PROJECTS/motor-digital-twin/docs/TESTING_REPORT.md): Pytest automated test results (18/18 passing) and frontend build verification.
- [**Engineering Limitations**](file:///d:/PROJECTS/motor-digital-twin/docs/LIMITATIONS.md): Operational boundaries, dataset scope, and RUL estimation ethics.

---

## 3. Scientific & Machine Learning Methodology

### 3.1 Feature Extraction Pipeline (17 Multidomain Descriptors)
For every vibration window (2048 samples at $F_s = 12,000\text{ Hz}$), 17 invariant descriptors are computed:

* **Time Domain (11 Moments):**
  * Mean ($\mu$)
  * Standard Deviation ($\sigma$)
  * Variance ($\sigma^2$)
  * Root Mean Square ($x_{\text{rms}}$)
  * Peak-to-Peak Amplitude ($x_{\text{ptp}} = \max(x) - \min(x)$)
  * Skewness ($S$)
  * Kurtosis ($K$)
  * Peak Absolute Amplitude ($x_{\text{peak}}$)
  * Crest Factor ($x_{\text{peak}} / x_{\text{rms}}$)
  * Shape Factor ($x_{\text{rms}} / \overline{|x|}$)
  * Impulse Factor ($x_{\text{peak}} / \overline{|x|}$)

* **Frequency Domain (6 Spectral Metrics):**
  * Dominant Frequency ($f_{\text{max}}$)
  * Spectral Centroid ($\sum f_k P_k$)
  * Spectral Energy ($\sum |X_k|^2$)
  * Spectral Standard Deviation
  * Spectral Skewness
  * Spectral Kurtosis

### 3.2 Data Leakage Prevention
To guarantee rigorous scientific validity:
* Overlapping windows from the same recording are **never** randomly partitioned across train and test sets.
* Each continuous recording is strictly partitioned chronologically (first 75% exclusively for training, final 25% exclusively for test).
* Feature scaling (`StandardScaler`) is fitted strictly on the training set and evaluated on the completely unseen test set.

---

## 4. Technology Stack

* **Frontend:**
  * React 18 & TypeScript 5
  * Vite
  * Tailwind CSS (Industrial Navy theme with Electric Blue & Cyan highlights)
  * Three.js / WebGL (Interactive 3D induction motor canvas)
  * Recharts (Responsive engineering telemetry charts)
  * Lucide Icons

* **Backend:**
  * Python 3.13
  * FastAPI & Pydantic v2
  * SQLAlchemy (ORM)
  * SQLite (`motor_twin.db` persistent database)
  * NumPy, SciPy, Scikit-learn, Joblib

---

## 5. Quick Start

### 5.1 Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m app.ml.train       # Trains models and generates metrics.json
pytest -v                   # Runs 18 automated unit and API integration tests
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API: `http://localhost:8000/api/docs`

### 5.2 Frontend Setup
```bash
cd frontend
npm install
npm run build              # Verifies TypeScript types and creates production bundle
npm run dev
```
Platform Web UI: `http://localhost:5173`

---

## 6. API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Operational health and ML model status |
| `GET` | `/api/dashboard/summary` | Diagnostic summary and fault distribution |
| `GET` | `/api/digital-twin/state` | Synchronized 3D motor telemetry and component health |
| `GET` | `/api/datasets` | Registered CWRU and uploaded vibration datasets |
| `GET` | `/api/datasets/{id}` | Dataset detail, signal slice preview, and features |
| `POST` | `/api/datasets/upload` | Upload and ingest `.mat` or `.csv` accelerometer files |
| `DELETE` | `/api/datasets/{id}` | Delete uploaded dataset (protects benchmark files) |
| `POST` | `/api/diagnosis/predict` | Multi-class fault inference with RF, SVM, or KNN |
| `POST` | `/api/diagnosis/analyze-signal` | FFT, spectral features, and STFT spectrogram |
| `GET` | `/api/diagnosis/history` | Historical diagnosis records from SQLite |
| `POST` | `/api/simulation/start` | Parametric synthetic motor vibration generator |
| `POST` | `/api/maintenance/analyze` | Isolation Forest anomaly detection and advisory |
| `GET` | `/api/models/performance` | Leak-free empirical validation metrics and confusion matrix |
| `POST` | `/api/models/train` | Retrain and benchmark all classifiers |
| `GET` | `/api/reports` | List archived ISO 10816 maintenance audit reports |
| `POST` | `/api/reports/generate` | Synthesize diagnostic state into formal audit sheet |
| `GET` | `/api/reports/{id}` | Retrieve specific maintenance audit report |
| `DELETE` | `/api/reports/{id}` | Delete archived maintenance report |

---

## 7. Academic License & Attribution
Case Western Reserve University (CWRU) Bearing Data Center: Kenneth A. Loparo, Case Western Reserve University, Cleveland, OH.
