# Project Overview — MOTOR TWIN AI

## Official Title
**"Design and Development of a Predictive Digital Twin for Electrical Motor Fault Diagnosis and Maintenance"**

**Subtitle:** Intelligent Electrical Motor Monitoring & Predictive Maintenance Platform  
**Target Domain:** Electrical & Electronics Engineering (EEE) + Artificial Intelligence & Machine Learning  
**Target Machine:** Reliance Electric 2 HP 3-Phase Squirrel-Cage Induction Motor (NEMA Frame 182T)  
**Reference Dataset:** Case Western Reserve University (CWRU) Bearing Data Center (SKF 6205-2RS JEM Deep Groove Ball Bearing)

---

## 1. Executive Summary

Modern industrial facilities rely heavily on three-phase squirrel-cage induction motors for critical manufacturing, pumping, HVAC, and power transmission infrastructure. Mechanical bearing degradation is responsible for approximately 40% to 50% of all electric motor failures in industrial operating environments. Traditional maintenance strategies either rely on reactive repair (run-to-breakdown) or calendar-based preventive scheduling, both of which incur substantial downtime and equipment lifecycle costs.

**MOTOR TWIN AI** addresses this challenge by providing an end-to-end, software-only **Predictive Digital Twin** engineering platform. The platform merges:
1. **Interactive 3D Virtual Representation:** A physically proportioned 3D induction motor rendered using Three.js / WebGL, complete with stator frame, cooling fins, shaft rotation driven by live or simulated RPM, terminal box, bearing housings, and component health heatmaps.
2. **Kinematic Signal Processing:** Fast Fourier Transform (FFT) spectral decomposition, Short-Time Fourier Transform (STFT) spectrogram analysis, and calculation of bearing defect characteristic frequencies ($f_r, f_{\text{BPFO}}, f_{\text{BPFI}}, f_{\text{BSF}}, f_{\text{FTF}}$) based on SKF 6205 bearing dimensions.
3. **Machine Learning Fault Classification:** Supervised multi-class classifiers (Random Forest, Support Vector Machine with RBF kernel, and K-Nearest Neighbors) operating on 17 standardized time-domain and frequency-domain vibration features.
4. **Unsupervised Anomaly Detection:** Isolation Forest trained on healthy baseline vibration signals to flag novel degradation patterns and anomalous operating dynamics.
5. **ISO 10816 Condition Severity Indexing:** Algorithmic calculation of vibration severity zones (Zone A, B, C, D) and motor health scores [0 to 100%].
6. **Academic Maintenance Advisory & Audit Reports:** Prescriptive remediation action work orders, historical log archives, and printable ISO 10816-1 audit documents.

---

## 2. Platform Modules & Functional Scope

The application consists of 10 fully implemented, interactive functional views:

| Module | Navigation Route | Primary Functionality |
|---|---|---|
| **Overview Dashboard** | `/overview` | Real-time health score, operating telemetry, recent diagnosis feed, and fault distribution charts. |
| **3D Digital Twin** | `/digital-twin` | Interactive Three.js induction motor with OrbitControls, PBR materials, RPM-driven shaft rotation, component raycasting, and solid/thermal/wireframe rendering modes. |
| **Fault Diagnosis** | `/diagnosis` | Multi-class fault inference across CWRU records using Random Forest, SVM, or KNN, with feature extraction and probability breakdown. |
| **Predictive Maintenance** | `/maintenance` | Isolation Forest anomaly scoring, health trend history, and scientific advisory. |
| **Motor Simulation** | `/simulation` | Parametric synthetic vibration generator modeling rotational harmonics, line frequency hum, and structural resonance defect impulses. |
| **Signal Analysis** | `/signals` | Interactive signal inspection laboratory with FFT magnitude spectrum and STFT time-frequency spectrogram. |
| **Model Performance** | `/models` | Leakage-free empirical model evaluation comparing RF, SVM, and KNN with confusion matrices, precision, recall, and macro F1 scores. |
| **Dataset Explorer** | `/datasets` | CWRU benchmark catalogue, signal slice preview, statistical feature extraction, and custom `.mat`/`.csv` file ingestion and deletion. |
| **Maintenance Reports** | `/reports` | Printable ISO 10816 engineering audit sheets with reference serials, component matrices, and remediation work orders. |
| **Settings** | `/settings` | Backend status diagnostics, database record metrics, API connectivity check, and academic disclosures. |

---

## 3. Academic Principles & Truth in Engineering

In adherence to strict academic engineering integrity:
1. **Zero Data Leakage:** Overlapping windows from the same continuous accelerometer recording are never randomly partitioned between training and test sets. Chronological partitioning (75% train / 25% test) is enforced prior to window segmentation.
2. **Honest RUL Reporting:** Remaining Useful Life (RUL) estimation is not faked from discrete seeded fault datasets. When run-to-failure continuous degradation measurements are absent, the platform explicitly displays:
   > *"RUL estimation unavailable — continuous run-to-failure degradation data required per academic validation protocol."*
3. **Simulation Disclosure:** Synthetic signals generated by the parametric physics engine are prominently watermarked:
   > *"SIMULATED DATA — NOT ACTUAL SENSOR SAMPLES"*
4. **Scope Boundaries:** The CWRU dataset validates drive-end and fan-end mechanical bearing faults. It is never misrepresented as validating electrical stator winding insulation breakdown, turn-to-turn shorts, or broken rotor bars.
