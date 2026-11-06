# Installation & Deployment Guide — MOTOR TWIN AI

## 1. System Requirements

### Hardware Requirements
- **Processor:** Modern dual-core CPU (Intel Core i3 / AMD Ryzen 3 or higher).
- **RAM:** 4 GB minimum (8 GB recommended for simultaneous Three.js rendering and ML training).
- **Disk Space:** 500 MB free space.
- **Display:** WebGL 2.0 compatible browser (Chrome, Edge, Firefox, Safari).

### Software Requirements
- **Operating System:** Windows 10/11, Ubuntu 20.04+, or macOS 12+.
- **Python:** Version 3.10 to 3.13.
- **Node.js:** Version 18.x or higher (LTS recommended).
- **npm:** Version 9.x or higher.

---

## 2. Local Setup Instructions

### 2.1 Clone or Navigate to Repository
```bash
git clone https://github.com/your-username/motor-digital-twin.git
cd motor-digital-twin
```

---

### 2.2 Backend Setup (FastAPI & Python)

1. Open a terminal in the project directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows:**
     ```powershell
     python -m venv .venv
     .venv\Scripts\activate
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install all required dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Train the ML models and seed benchmark datasets:
   ```bash
   python -m app.ml.train
   ```
   *This generates `models/rf_model.joblib`, `models/svm_model.joblib`, `models/knn_model.joblib`, `models/isolation_forest.joblib`, `models/scaler.joblib`, and `models/metrics.json`.*

5. Run the automated backend verification test suite:
   ```bash
   pytest -v
   ```
   *All 18 tests should pass.*

6. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Interactive API documentation is now live at: `http://localhost:8000/api/docs`.*

---

### 2.3 Frontend Setup (React, TypeScript & Vite)

1. Open a second terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Verify production compilation:
   ```bash
   npm run build
   ```

4. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   *The platform is now accessible at: `http://localhost:5173`.*

---

## 3. Production Deployment

### 3.1 Frontend Deployment (Vercel / Netlify)
1. Set the root directory to `frontend`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-domain.com/api
   ```

### 3.2 Backend Deployment (Render / Railway / DigitalOcean)
1. Set root directory to `backend`.
2. Environment: Python 3.11+
3. Build command:
   ```bash
   pip install -r requirements.txt && python -m app.ml.train
   ```
4. Start command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Environment variable:
   ```
   BACKEND_CORS_ORIGINS=["https://your-frontend-domain.vercel.app","http://localhost:5173"]
   ```

---

## 4. Verification Checklist

After launching both servers, verify the installation by checking:
- [x] Backend responds with HTTP 200 at `http://localhost:8000/api/health` with `status: "operational"`.
- [x] Frontend renders at `http://localhost:5173` with green indicator `API Synced (8000)`.
- [x] 3D induction motor renders immediately in the "3D Digital Twin" tab with rotating shaft.
- [x] Fault diagnosis inference executes and outputs confidence percentages in the "Fault Diagnosis" tab.
- [x] Maintenance audit reports can be compiled and printed in the "Maintenance Reports" tab.
