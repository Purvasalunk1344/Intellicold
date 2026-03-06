"""
IntelliCold — ML Training Pipeline
====================================
Trains on 3 real datasets:
  • KAGGLE.xlsx   (999 rows  — Sensor_Log sheet)
  • ACM_TRAIN.xlsx (1000 rows — full dataset)
  • ACM_MAIN.xlsx  (800 rows  — train split)
Test evaluation on:
  • ACM_ML.xlsx   (200 rows  — held-out test set)

Models produced:
  • classifier.pkl    → spoilage risk level  (Low / Medium / High / Critical)
  • quality_reg.pkl   → quality remaining %  (0–100)
  • time_reg.pkl      → hours to spoilage    (0–72)
  • action_clf.pkl    → recommended action   (4 classes)
  • encoders.pkl      → label encoders + feature list
"""

import pandas as pd
import numpy as np
import openpyxl
import joblib, os, warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble          import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model      import LogisticRegression
from sklearn.preprocessing     import LabelEncoder, StandardScaler
from sklearn.model_selection   import cross_val_score, StratifiedKFold
from sklearn.metrics           import (accuracy_score, classification_report,
                                       mean_absolute_error, r2_score,
                                       confusion_matrix)
from sklearn.pipeline          import Pipeline
from sklearn.impute             import SimpleImputer

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATA LOADING
# ─────────────────────────────────────────────────────────────────────────────

def load_excel(path, sheet):
    wb  = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws  = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h) for h in rows[0]]
    data    = [dict(zip(headers, r)) for r in rows[1:] if any(v is not None for v in r)]
    return pd.DataFrame(data)

print("=" * 65)
print("  IntelliCold — Loading Real Datasets")
print("=" * 65)

# ── KAGGLE dataset (Sensor_Log) ──────────────────────────────────────────────
df_kaggle = load_excel('/mnt/user-data/uploads/KAGGLE.xlsx', 'Sensor_Log')
print(f"\n[1] KAGGLE Sensor_Log       : {len(df_kaggle):>5} rows  |  {len(df_kaggle.columns)} cols")

# Rename to unified schema
df_kaggle = df_kaggle.rename(columns={
    'Temperature_C'         : 'avg_temp_c',
    'Humidity_pct'          : 'humidity_percent',
    'Exposure_Duration_hrs' : 'transport_duration_hr',
    'Cumulative_Damage_Index': 'cumulative_damage_index',
    'Quality_Remaining_pct' : 'quality_remaining_percent',
    'Time_to_Spoilage_hrs'  : 'time_to_spoilage_hr',
    'Spoilage_Risk'         : 'spoilage_risk',
    'Recommended_Action'    : 'recommended_action',
    'Delivery_Priority'     : 'delivery_priority',
    'Product_Type'          : 'product_type',
    'NH3_ppm'               : 'nh3_ppm',
    'H2S_ppm'               : 'h2s_ppm',
    'CO2_ppm'               : 'co2_ppm',
    'Ethylene_ppm'          : 'ethylene_ppm',
})
# Normalise risk labels to lowercase
df_kaggle['spoilage_risk'] = df_kaggle['spoilage_risk'].str.lower()
# Fill missing ACM columns
for col in ['origin_temp_c','max_temp_c','distance_km','vehicle_type',
            'temp_deviation_degree_hr']:
    if col not in df_kaggle.columns:
        df_kaggle[col] = np.nan
df_kaggle['max_temp_c']    = df_kaggle['avg_temp_c'] + np.random.uniform(1, 3, len(df_kaggle))
df_kaggle['origin_temp_c'] = df_kaggle['avg_temp_c'] - np.random.uniform(0, 2, len(df_kaggle))

# ── ACM datasets ─────────────────────────────────────────────────────────────
df_acm_full  = load_excel('/mnt/user-data/uploads/ACM_TRAIN.xlsx', 'intellicold_full_1000_rows.csv')
df_acm_train = load_excel('/mnt/user-data/uploads/ACM_MAIN.xlsx',  'intellicold_train_800_rows.csv')
df_acm_test  = load_excel('/mnt/user-data/uploads/ACM_ML.xlsx',    'intellicold_test_200_rows.csv')

print(f"[2] ACM Full (train+val)    : {len(df_acm_full):>5} rows  |  {len(df_acm_full.columns)} cols")
print(f"[3] ACM Main (train split)  : {len(df_acm_train):>5} rows  |  {len(df_acm_train.columns)} cols")
print(f"[4] ACM Test (held-out)     : {len(df_acm_test):>5} rows  |  {len(df_acm_test.columns)} cols")

# ─────────────────────────────────────────────────────────────────────────────
# 2. MERGE & UNIFY SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

COMMON_COLS = [
    'product_type', 'avg_temp_c', 'max_temp_c', 'origin_temp_c',
    'humidity_percent', 'transport_duration_hr', 'distance_km',
    'vehicle_type', 'nh3_ppm', 'h2s_ppm', 'co2_ppm', 'ethylene_ppm',
    'temp_deviation_degree_hr', 'cumulative_damage_index',
    'quality_remaining_percent', 'time_to_spoilage_hr',
    'spoilage_risk', 'recommended_action',
]

def harmonize(df):
    for col in COMMON_COLS:
        if col not in df.columns:
            df[col] = np.nan
    df['spoilage_risk']     = df['spoilage_risk'].astype(str).str.lower().str.strip()
    df['recommended_action']= df['recommended_action'].astype(str).str.strip()
    df['product_type']      = df['product_type'].astype(str).str.lower().str.strip()
    return df[COMMON_COLS].copy()

# Training corpus = KAGGLE + ACM_FULL + ACM_MAIN  (deduplicated on features)
df_train = pd.concat([
    harmonize(df_kaggle),
    harmonize(df_acm_full),
    harmonize(df_acm_train),
], ignore_index=True).drop_duplicates()

df_test  = harmonize(df_acm_test)

print(f"\n[COMBINED] Train corpus     : {len(df_train):>5} rows")
print(f"[COMBINED] Test set         : {len(df_test):>5} rows")

# ─────────────────────────────────────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(df):
    df = df.copy()

    # Numeric conversions
    num_cols = ['avg_temp_c','max_temp_c','origin_temp_c','humidity_percent',
                'transport_duration_hr','distance_km','nh3_ppm','h2s_ppm',
                'co2_ppm','ethylene_ppm','temp_deviation_degree_hr',
                'cumulative_damage_index']
    for c in num_cols:
        df[c] = pd.to_numeric(df[c], errors='coerce')

    # Derived features
    df['temp_range']        = df['max_temp_c'] - df['avg_temp_c']
    df['temp_excess']       = (df['avg_temp_c'] - 4).clip(lower=0)   # degrees above safe (4°C)
    df['speed_kmph']        = df['distance_km'] / df['transport_duration_hr'].replace(0, np.nan)
    df['gas_stress_index']  = df['nh3_ppm'] * 0.4 + df['h2s_ppm'] * 2 + df['ethylene_ppm'] * 0.1
    df['thermal_load']      = df['temp_deviation_degree_hr'] * df['humidity_percent'] / 100
    df['distance_per_temp'] = df['distance_km'] / (df['avg_temp_c'].abs() + 1)

    # Encode categoricals
    vehicle_map  = {'reefer_truck': 0, 'insulated_van': 1, 'open_truck': 2}
    product_map  = {'milk': 0, 'meat': 1, 'seafood': 2, 'fish': 2,
                    'vaccine': 3, 'yogurt': 0, 'fruit': 4, 'vegetable': 5}
    df['vehicle_enc']  = df['vehicle_type'].map(vehicle_map).fillna(1)
    df['product_enc']  = df['product_type'].map(product_map).fillna(4)

    return df

df_train = engineer_features(df_train)
df_test  = engineer_features(df_test)

# ── Feature columns used by models ───────────────────────────────────────────
FEATURES = [
    'avg_temp_c', 'max_temp_c', 'origin_temp_c',
    'humidity_percent', 'transport_duration_hr', 'distance_km',
    'nh3_ppm', 'h2s_ppm', 'co2_ppm', 'ethylene_ppm',
    'temp_deviation_degree_hr', 'cumulative_damage_index',
    'temp_range', 'temp_excess', 'speed_kmph',
    'gas_stress_index', 'thermal_load', 'distance_per_temp',
    'vehicle_enc', 'product_enc',
]

X_train = df_train[FEATURES]
X_test  = df_test[FEATURES]

# ── Target encoders ───────────────────────────────────────────────────────────

# Risk encoder  (Low=0, Medium=1, High=2, Critical=3)
RISK_ORDER = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
y_risk_train = df_train['spoilage_risk'].map(RISK_ORDER).fillna(1).astype(int)
y_risk_test  = df_test['spoilage_risk'].map(RISK_ORDER).fillna(1).astype(int)

# Quality remaining %
y_qual_train = pd.to_numeric(df_train['quality_remaining_percent'], errors='coerce').fillna(50)
y_qual_test  = pd.to_numeric(df_test['quality_remaining_percent'],  errors='coerce').fillna(50)

# Time to spoilage (hrs)
y_time_train = pd.to_numeric(df_train['time_to_spoilage_hr'], errors='coerce').fillna(24)
y_time_test  = pd.to_numeric(df_test['time_to_spoilage_hr'],  errors='coerce').fillna(24)

# Action encoder
action_le = LabelEncoder()
y_action_train = action_le.fit_transform(df_train['recommended_action'].fillna('maintain_cooling'))
y_action_test  = action_le.transform(
    df_test['recommended_action'].fillna('maintain_cooling').map(
        lambda x: x if x in action_le.classes_ else 'maintain_cooling'
    )
)

print("\n" + "=" * 65)
print("  Target Class Distributions (Train)")
print("=" * 65)
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