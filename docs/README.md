# IntelliCold

A full-stack proof-of-concept for **cold-chain shipment monitoring & spoilage prediction**, including:

- ✅ **Frontend dashboard** (React)
- ✅ **Backend API** (FastAPI)
- ✅ **ML model inference** (scikit-learn)
- ✅ **Data pipeline + training scripts** (Python)

---

## 🚀 Getting Started

### 1) Install dependencies

#### Backend (Python)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### Frontend (Node)
```powershell
cd frontend
npm install
```

---

## ▶️ Run the Project

### Backend
```powershell
cd backend
python app.py
```

This starts the FastAPI backend (default: http://localhost:5000).

### Frontend
```powershell
cd frontend
npm start
```

Then open http://localhost:3000 in your browser.

---

## 🧠 ML Models

Model artifacts are stored under:

- `backend/ml_model/models/`

> **Note:** Large `.pkl` files are tracked via **Git LFS**. If you clone the repo, ensure Git LFS is installed and run: `git lfs pull`.

---

## 📂 Repo Structure (High Level)

- `backend/` – Python API + ML inference code
- `frontend/` – React dashboard UI
- `hardware/` – ESP32 firmware (sensor data ingestion)

---

## 🧪 Training / Model Updates

The training pipeline is located in the backend and can be re-run to update the model artifacts.

> Note: some training scripts may expect data files that are not included in the repo (due to file size / licensing).

---

## ✅ Tips

- If you get `413 Payload Too Large` or related errors, the model files may need to be regenerated or excluded.
- Keep large binary models in `backend/ml_model/models/` and use Git LFS as already configured.

---

Happy building! 🚚❄️
