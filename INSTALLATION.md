# Installation & Deployment Guide — MOTOR TWIN AI

## 1. System Requirements

### Hardware Requirements
- Processor: Modern dual-core CPU or higher.
- RAM: 4 GB minimum; 8 GB recommended.
- Disk Space: 500 MB free space.
- Display: WebGL 2.0 compatible browser.

### Software Requirements
- Windows 10/11, Ubuntu 20.04+, or macOS 12+.
- Python 3.10–3.13.
- Node.js 18 or higher.
- npm 9 or higher.

## 2. Local Setup Instructions

### 2.1 Clone the Repository

```bash
git clone https://github.com/durgasashanktalari-ai/motor-digital-twin.git
cd motor-digital-twin
```

### 2.2 Backend Setup

The backend source code is located in the root-level `app/` directory.

Create a virtual environment:

**Windows PowerShell**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Linux / macOS**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start the backend:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

API documentation:

`http://localhost:8000/api/docs`

Run backend tests from the repository root in a separate terminal:

```bash
pytest -v
```

### 2.3 Frontend Setup

The React frontend source code is located in the root-level `src/` directory. Its `package.json` is also in the repository root.

Open a second terminal in the repository root:

```bash
npm install
npm run dev
```

Open:

`http://localhost:5173`

Verify the production build:

```bash
npm run build
```

## 3. Production Deployment

The frontend and backend currently share the repository root. Configure deployment using the root directory.

### Frontend
- Root directory: repository root
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL` set to your deployed backend API URL, if supported by the application.

### Backend
- Root directory: repository root
- Install command: `pip install -r requirements.txt`
- Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Configure CORS using the actual frontend deployment URL and the backend's supported configuration.

## 4. Verification

After starting both servers, verify:

- Backend health endpoint responds successfully.
- Frontend loads in the browser.
- API connection works.
- 3D Digital Twin renders.
- Fault diagnosis responds.
- Maintenance reports can be generated.

**Note:** Test results and feature behavior should be confirmed on the target machine before being described as verified.
