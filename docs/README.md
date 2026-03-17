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
risk_counts = y_risk_train.value_counts().sort_index()
for k, v in RISK_ORDER.items():
    print(f"  Risk {k.capitalize():<10}: {risk_counts.get(v, 0):>5} samples")

print(f"\n  Actions: {dict(zip(action_le.classes_, np.bincount(y_action_train)))}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. BUILD PIPELINES (Imputer → Model)
# ─────────────────────────────────────────────────────────────────────────────

def make_pipe(model):
    return Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('model',   model),
    ])

print("\n" + "=" * 65)
print("  Training Models")
print("=" * 65)

# ── 4a. Spoilage Risk Classifier (Random Forest) ─────────────────────────────
print("\n[1/4] Spoilage Risk Classifier — Random Forest ...")
risk_clf = make_pipe(RandomForestClassifier(
    n_estimators=300, max_depth=12, min_samples_leaf=2,
    class_weight='balanced', random_state=42, n_jobs=-1
))
risk_clf.fit(X_train, y_risk_train)

# 5-fold CV on training set
cv_acc = cross_val_score(risk_clf, X_train, y_risk_train,
                         cv=StratifiedKFold(5, shuffle=True, random_state=42),
                         scoring='accuracy')
print(f"  CV Accuracy  : {cv_acc.mean():.4f} ± {cv_acc.std():.4f}")

y_risk_pred = risk_clf.predict(X_test)
print(f"  Test Accuracy: {accuracy_score(y_risk_test, y_risk_pred):.4f}")
print("\n  Classification Report (Test):")
RISK_NAMES = ['Low', 'Medium', 'High', 'Critical']
present_labels = sorted(set(y_risk_test) | set(y_risk_pred))
print(classification_report(y_risk_test, y_risk_pred,
                             labels=present_labels,
                             target_names=[RISK_NAMES[i] for i in present_labels],
                             zero_division=0))

# ── 4b. Quality Remaining Regressor (Random Forest) ──────────────────────────
print("[2/4] Quality Remaining % — Random Forest Regressor ...")
qual_reg = make_pipe(RandomForestRegressor(
    n_estimators=300, max_depth=15, min_samples_leaf=2,
    random_state=42, n_jobs=-1
))
qual_reg.fit(X_train, y_qual_train)

cv_mae = -cross_val_score(qual_reg, X_train, y_qual_train,
                           cv=5, scoring='neg_mean_absolute_error')
print(f"  CV MAE       : {cv_mae.mean():.2f} ± {cv_mae.std():.2f} %")

y_qual_pred = qual_reg.predict(X_test)
print(f"  Test MAE     : {mean_absolute_error(y_qual_test, y_qual_pred):.2f} %")
print(f"  Test R²      : {r2_score(y_qual_test, y_qual_pred):.4f}")

# ── 4c. Time to Spoilage Regressor (Gradient Boosting) ───────────────────────
print("\n[3/4] Time to Spoilage (hrs) — Gradient Boosting Regressor ...")
time_reg = make_pipe(GradientBoostingRegressor(
    n_estimators=300, max_depth=5, learning_rate=0.05,
    subsample=0.8, random_state=42
))
time_reg.fit(X_train, y_time_train)

cv_tmae = -cross_val_score(time_reg, X_train, y_time_train,
                            cv=5, scoring='neg_mean_absolute_error')
print(f"  CV MAE       : {cv_tmae.mean():.2f} ± {cv_tmae.std():.2f} hrs")

y_time_pred = time_reg.predict(X_test)
print(f"  Test MAE     : {mean_absolute_error(y_time_test, y_time_pred):.2f} hrs")
print(f"  Test R²      : {r2_score(y_time_test, y_time_pred):.4f}")

# ── 4d. Recommended Action Classifier ────────────────────────────────────────
print("\n[4/4] Recommended Action — Random Forest Classifier ...")
action_clf = make_pipe(RandomForestClassifier(
    n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
))
action_clf.fit(X_train, y_action_train)

cv_act = cross_val_score(action_clf, X_train, y_action_train,
                          cv=StratifiedKFold(5, shuffle=True, random_state=42),
                          scoring='accuracy')
print(f"  CV Accuracy  : {cv_act.mean():.4f} ± {cv_act.std():.4f}")

y_act_pred = action_clf.predict(X_test)
print(f"  Test Accuracy: {accuracy_score(y_action_test, y_act_pred):.4f}")
print("\n  Action Classes:", list(action_le.classes_))

# ── Feature Importance (top 10) ───────────────────────────────────────────────
print("\n" + "=" * 65)
print("  Top 10 Feature Importances (Risk Classifier)")
print("=" * 65)
importances = risk_clf.named_steps['model'].feature_importances_
feat_imp = sorted(zip(FEATURES, importances), key=lambda x: x[1], reverse=True)
for fname, imp in feat_imp[:10]:
    bar = '█' * int(imp * 200)
    print(f"  {fname:<30} {imp:.4f}  {bar}")

# ─────────────────────────────────────────────────────────────────────────────
# 5. SAVE MODELS
# ─────────────────────────────────────────────────────────────────────────────
os.makedirs('ml_model', exist_ok=True)

joblib.dump(risk_clf,   'ml_model/classifier.pkl')
joblib.dump(qual_reg,   'ml_model/quality_reg.pkl')
joblib.dump(time_reg,   'ml_model/time_reg.pkl')
joblib.dump(action_clf, 'ml_model/action_clf.pkl')
joblib.dump({
    'features'    : FEATURES,
    'risk_order'  : RISK_ORDER,
    'risk_names'  : RISK_NAMES,
    'action_le'   : action_le,
}, 'ml_model/encoders.pkl')

print("\n" + "=" * 65)
print("  ✅  All models saved to ml_model/")
print("=" * 65)

# ─────────────────────────────────────────────────────────────────────────────
# 6. QUICK INFERENCE TEST
# ─────────────────────────────────────────────────────────────────────────────
print("\n  Quick Inference Test — 3 sample predictions:")
print("-" * 65)

sample_cases = [
    {   # Safe vaccine shipment
        'avg_temp_c':3.5, 'max_temp_c':5.0, 'origin_temp_c':2.0,
        'humidity_percent':60, 'transport_duration_hr':4, 'distance_km':150,
        'nh3_ppm':1.0, 'h2s_ppm':0.05, 'co2_ppm':400, 'ethylene_ppm':0.5,
        'temp_deviation_degree_hr':2.0, 'cumulative_damage_index':0.05,
        'vehicle_type':'reefer_truck', 'product_type':'vaccine',
    },
    {   # Medium risk dairy
        'avg_temp_c':7.0, 'max_temp_c':12.0, 'origin_temp_c':4.0,
        'humidity_percent':78, 'transport_duration_hr':18, 'distance_km':300,
        'nh3_ppm':4.0, 'h2s_ppm':0.4, 'co2_ppm':550, 'ethylene_ppm':5.0,
        'temp_deviation_degree_hr':25, 'cumulative_damage_index':0.4,
        'vehicle_type':'insulated_van', 'product_type':'milk',
    },
    {   # Critical seafood
        'avg_temp_c':12.0, 'max_temp_c':16.0, 'origin_temp_c':1.0,
        'humidity_percent':88, 'transport_duration_hr':36, 'distance_km':500,
        'nh3_ppm':9.0, 'h2s_ppm':1.5, 'co2_ppm':800, 'ethylene_ppm':0.0,
        'temp_deviation_degree_hr':120, 'cumulative_damage_index':3.5,
        'vehicle_type':'open_truck', 'product_type':'seafood',
    },
]

vehicle_map = {'reefer_truck':0,'insulated_van':1,'open_truck':2}
product_map = {'milk':0,'meat':1,'seafood':2,'fish':2,'vaccine':3,'yogurt':0,'fruit':4,'vegetable':5}

for i, case in enumerate(sample_cases, 1):
    row = {f: case.get(f, 0) for f in FEATURES[:12]}
    row['temp_range']        = case['max_temp_c'] - case['avg_temp_c']
    row['temp_excess']       = max(0, case['avg_temp_c'] - 4)
    row['speed_kmph']        = case['distance_km'] / case['transport_duration_hr']
    row['gas_stress_index']  = case['nh3_ppm']*0.4 + case['h2s_ppm']*2 + case['ethylene_ppm']*0.1
    row['thermal_load']      = case['temp_deviation_degree_hr'] * case['humidity_percent'] / 100
    row['distance_per_temp'] = case['distance_km'] / (abs(case['avg_temp_c']) + 1)
    row['vehicle_enc']       = vehicle_map.get(case['vehicle_type'], 1)
    row['product_enc']       = product_map.get(case['product_type'], 4)

    X_s = pd.DataFrame([row])[FEATURES]
    risk_idx = int(risk_clf.predict(X_s)[0])
    quality  = float(np.clip(qual_reg.predict(X_s)[0], 0, 100))
    t_spoil  = float(np.clip(time_reg.predict(X_s)[0], 0, 72))
    act_idx  = int(action_clf.predict(X_s)[0])
    action   = action_le.inverse_transform([act_idx])[0]

    print(f"\n  Case {i} [{case['product_type'].upper()} via {case['vehicle_type']}]")
    print(f"    Risk Level      : {RISK_NAMES[risk_idx]}")
    print(f"    Quality Remain  : {quality:.1f}%")
    print(f"    Time to Spoilage: {t_spoil:.1f} hrs")
    print(f"    Recommended Act : {action}")

print("\n" + "=" * 65)
print("  Training complete!  Run python app.py to start the backend.")
print("=" * 65)