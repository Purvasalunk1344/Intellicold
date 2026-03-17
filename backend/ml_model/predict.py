"""
IntelliCold - Fixed predict.py
Scaler expects 21 features (including spoilage_probability, remaining_shelf_life_hours)
Risk/Action models expect 20 features (including category_encoded, product_name_encoded)
"""

import numpy as np
import pandas as pd
import joblib
import os
from typing import Dict, Any

# ══════════════════════════════════════════════════════════════
# LOAD MODELS
# ══════════════════════════════════════════════════════════════

_BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_BASE_DIR, 'models')

print(f"Loading models from: {_MODELS_DIR}")

try:
    scaler    = joblib.load(os.path.join(_MODELS_DIR, 'scaler.pkl'))
    risk_m    = joblib.load(os.path.join(_MODELS_DIR, 'risk_model.pkl'))
    action_m  = joblib.load(os.path.join(_MODELS_DIR, 'action_model.pkl'))

    # quality and time from package
    pkg       = joblib.load(os.path.join(_MODELS_DIR, 'intellicold_model_package.pkl'))
    quality_m = pkg['model'] if isinstance(pkg, dict) else pkg
    time_m    = quality_m  # same model used for both

    print("[OK] All models loaded successfully!")
except Exception as e:
    print(f"[ERROR] Loading models failed: {e}")
    raise

# ══════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════

# LabelEncoder order from training
RISK_CLASSES   = ['Critical', 'High', 'Low', 'Medium']
ACTION_CLASSES = [
    'Immediate cooling and delivery',
    'Increase cooling',
    'Maintain cold chain',
    'Prioritize delivery',
]

# Risk index for frontend (0=Low,1=Medium,2=High,3=Critical)
RISK_INDEX = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}

# FSSAI safe temperatures (low, mid, high)
PRODUCT_TEMPS = {
    'mango':(10,12,13),'banana':(13,14,15),'papaya':(10,11,13),
    'guava':(8,10,12),'pineapple':(10,11,13),'watermelon':(10,13,15),
    'pomegranate':(5,7,8),'apple':(0,2,4),'grapes':(0,1,2),
    'orange':(5,7,10),'tomato':(10,12,13),'potato':(4,7,10),
    'onion':(0,2,4),'spinach':(0,1,2),'broccoli':(0,1,2),
    'cabbage':(0,2,4),'cauliflower':(0,2,4),'carrot':(0,2,4),
    'cucumber':(10,12,13),'capsicum':(7,10,13),
    'milk':(2,3,4),'paneer':(2,3,4),'yogurt':(2,3,4),
    'butter':(2,3,5),'cheese':(2,4,6),
    'chicken':(0,2,4),'mutton':(0,2,4),'fish':(0,1,2),'prawns':(0,1,2),
    # Generic fallbacks
    'meat':(0,2,4),'dairy':(2,3,4),'vegetables':(0,2,4),
    'fruits':(5,7,10),'vaccines':(2,4,6),
}

PRODUCT_HUMIDITY = {
    'meat':(85,90,95),'chicken':(85,90,95),'fish':(85,90,95),
    'prawns':(85,90,95),'mutton':(85,90,95),
    'milk':(60,70,80),'dairy':(60,70,80),'paneer':(60,70,80),
    'yogurt':(60,70,80),'butter':(60,70,80),'cheese':(65,75,85),
    'vaccines':(60,70,80),
}
DEFAULT_HUMIDITY = (85, 90, 95)

# category_encoded from training LabelEncoder
# dairy=0, fruit=1, meat=2, vegetable=3
CATEGORY_ENC = {
    'apple':1,'banana':1,'grapes':1,'guava':1,'mango':1,'orange':1,
    'papaya':1,'pineapple':1,'pomegranate':1,'watermelon':1,'fruits':1,
    'broccoli':3,'cabbage':3,'capsicum':3,'carrot':3,'cauliflower':3,
    'cucumber':3,'onion':3,'potato':3,'spinach':3,'tomato':3,'vegetables':3,
    'butter':0,'cheese':0,'dairy':0,'milk':0,'paneer':0,'yogurt':0,
    'chicken':2,'fish':2,'meat':2,'mutton':2,'prawns':2,
    'vaccines':0,
}

# product_name_encoded from training LabelEncoder (alphabetical order)
PRODUCT_ENC = {
    'apple':0,'banana':1,'broccoli':2,'butter':3,'cabbage':4,
    'capsicum':5,'carrot':6,'cauliflower':7,'cheese':8,'chicken':9,
    'cucumber':10,'fish':11,'grapes':12,'guava':13,'mango':14,
    'milk':15,'mutton':16,'onion':17,'orange':18,'paneer':19,
    'papaya':20,'pineapple':21,'pomegranate':22,'potato':23,
    'prawns':24,'spinach':25,'tomato':26,'watermelon':27,'yogurt':28,
    # Fallbacks
    'meat':9,'dairy':15,'vegetables':26,'fruits':14,'vaccines':15,
}

# Spoilage probability ranges per risk (from dataset)
# Low:0.02-0.30, Medium:0.30-0.58, High:0.58-0.82, Critical:0.82-1.00
# Shelf life ranges: Low:67-94, Medium:40-67, High:17-40, Critical:1-17

# Scaler features (21)
SCALER_COLS = [
    'temperature_C','humidity_percent',
    'safe_temp_low_C','safe_temp_mid_C','safe_temp_high_C',
    'humidity_low_percent','humidity_mid_percent','humidity_high_percent',
    'exposure_hours','ethylene_ppm','co2_ppm','nh3_ppm','h2s_ppm',
    'temp_deviation','temp_deviation_degree_hr',
    'cumulative_damage_index','humidity_deviation',
    'spoilage_probability','remaining_shelf_life_hours',
    'risk_encoded','action_encoded',
]

# Model features (20) - what risk/action models expect
MODEL_COLS = [
    'temperature_C','humidity_percent',
    'safe_temp_low_C','safe_temp_mid_C','safe_temp_high_C',
    'humidity_low_percent','humidity_mid_percent','humidity_high_percent',
    'exposure_hours','ethylene_ppm','co2_ppm','nh3_ppm','h2s_ppm',
    'temp_deviation','temp_deviation_degree_hr',
    'cumulative_damage_index','humidity_deviation',
    'temp_danger_flag','category_encoded','product_name_encoded',
]

# ══════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════

def engineer_features(data: Dict[str, Any]):
    """
    Build two DataFrames:
    1. scaler_df  — 21 features for scaler
    2. model_df   — 20 features for risk/action models (after scaling)
    Also returns spoilage_probability and remaining_shelf_life_hours
    """
    temp     = float(data.get('avg_temp_c',           data.get('temperature_C', 5.0)))
    humidity = float(data.get('humidity_percent',      70.0))
    exposure = float(data.get('transport_duration_hr', data.get('exposure_hours', 12.0)))
    product  = str(data.get('product_type',            data.get('product_name', 'milk'))).lower()
    ethylene = float(data.get('ethylene_ppm', 5.0))
    co2      = float(data.get('co2_ppm',     500.0))
    nh3      = float(data.get('nh3_ppm',     2.0))
    h2s      = float(data.get('h2s_ppm',     0.2))

    # Safe temps
    sl, sm, sh = PRODUCT_TEMPS.get(product, (2, 4, 6))
    hl, hm, hh = PRODUCT_HUMIDITY.get(product, DEFAULT_HUMIDITY)

    # Derived
    td   = round(temp - sm, 4)
    tdhr = round(td * exposure, 4)
    hd   = round(humidity - hm, 4)
    tf   = 1 if temp > sh else 0

    Ea = 50000; R = 8.314
    try:
        cdi = round(min(float(np.exp((Ea/R)*(1/(sm+273.15)-1/(temp+273.15)))*exposure/100), 1.0), 6)
    except:
        cdi = 0.0

    # Estimate spoilage_probability from CDI and temp danger
    # Matches training data ranges
    if tf == 0:
        sp = round(min(cdi * 0.3, 0.29), 4)       # Low risk range
    elif cdi < 0.3:
        sp = round(0.30 + cdi * 0.5, 4)           # Medium range
    elif cdi < 0.7:
        sp = round(0.58 + (cdi - 0.3) * 0.6, 4)  # High range
    else:
        sp = round(min(0.82 + (cdi - 0.7) * 0.6, 1.0), 4)  # Critical range

    # Shelf life estimation
    shelf = round(max(0.0, (1.0 - sp) * 94.0), 1)

    # Encoded categoricals
    cat_enc  = CATEGORY_ENC.get(product, 1)
    prod_enc = PRODUCT_ENC.get(product, 14)

    # Scaler DataFrame (21 features) ──
    scaler_df = pd.DataFrame([{
        'temperature_C':             temp,
        'humidity_percent':          humidity,
        'safe_temp_low_C':           sl,
        'safe_temp_mid_C':           sm,
        'safe_temp_high_C':          sh,
        'humidity_low_percent':      hl,
        'humidity_mid_percent':      hm,
        'humidity_high_percent':     hh,
        'exposure_hours':            exposure,
        'ethylene_ppm':              ethylene,
        'co2_ppm':                   co2,
        'nh3_ppm':                   nh3,
        'h2s_ppm':                   h2s,
        'temp_deviation':            td,
        'temp_deviation_degree_hr':  tdhr,
        'cumulative_damage_index':   cdi,
        'humidity_deviation':        hd,
        'spoilage_probability':      sp,
        'remaining_shelf_life_hours':shelf,
        'risk_encoded':              0,    # placeholder
        'action_encoded':            0,    # placeholder
    }])[SCALER_COLS]

    # Model DataFrame (20 features) ──
    model_df = pd.DataFrame([{
        'temperature_C':             temp,
        'humidity_percent':          humidity,
        'safe_temp_low_C':           sl,
        'safe_temp_mid_C':           sm,
        'safe_temp_high_C':          sh,
        'humidity_low_percent':      hl,
        'humidity_mid_percent':      hm,
        'humidity_high_percent':     hh,
        'exposure_hours':            exposure,
        'ethylene_ppm':              ethylene,
        'co2_ppm':                   co2,
        'nh3_ppm':                   nh3,
        'h2s_ppm':                   h2s,
        'temp_deviation':            td,
        'temp_deviation_degree_hr':  tdhr,
        'cumulative_damage_index':   cdi,
        'humidity_deviation':        hd,
        'temp_danger_flag':          tf,
        'category_encoded':          cat_enc,
        'product_name_encoded':      prod_enc,
    }])[MODEL_COLS]

    return scaler_df, model_df, sp, shelf


# ══════════════════════════════════════════════════════════════
# PREDICT
# ══════════════════════════════════════════════════════════════

def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Main prediction function"""

    scaler_df, model_df, sp, shelf = engineer_features(data)

    # Scale the 21-feature scaler input (not used for model directly)
    scaler.transform(scaler_df)  # just validate — we use model_df for models

    # Models use model_df (20 features) directly — no scaling needed
    # (models were trained on unscaled featured_dataset.csv features)
    X_np = model_df.values

    # Risk prediction
    risk_raw   = risk_m.predict(X_np)[0]
    risk_label = str(risk_raw) if isinstance(risk_raw, str) else RISK_CLASSES[int(risk_raw)]
    risk_code  = RISK_CLASSES.index(risk_label) if risk_label in RISK_CLASSES else 2
    risk_probs = risk_m.predict_proba(X_np)[0]
    # risk_label already set above
    risk_index = RISK_INDEX.get(risk_label, 0)

    # Action prediction
    try:
        action_code  = int(action_m.predict(X_np)[0])
        action_label = ACTION_CLASSES[action_code] if action_code < len(ACTION_CLASSES) else ACTION_CLASSES[2]
    except:
        action_label = ACTION_CLASSES[min(risk_index, 3)]

    # Quality remaining (inverse of spoilage)
    quality_pct = round((1.0 - sp) * 100.0, 1)

    # Risk probabilities
    risk_prob_dict = {}
    for i, label in enumerate(RISK_CLASSES):
        risk_prob_dict[label] = round(float(risk_probs[i]), 3) if i < len(risk_probs) else 0.0

    return {
        'quality_remaining':  max(0.0, min(100.0, quality_pct)),
        'risk_level':         risk_label,
        'risk_index':         risk_index,
        'hours_to_spoilage':  round(max(0.0, shelf), 1),
        'recommended_action': action_label,
        'risk_probabilities': risk_prob_dict,
    }


# ══════════════════════════════════════════════════════════════
# QUICK TEST
# ══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    tests = [
        {'avg_temp_c': 3.0,  'humidity_percent': 70, 'transport_duration_hr': 6,  'product_type': 'milk'},
        {'avg_temp_c': 22.0, 'humidity_percent': 75, 'transport_duration_hr': 12, 'product_type': 'milk'},
        {'avg_temp_c': 2.0,  'humidity_percent': 90, 'transport_duration_hr': 4,  'product_type': 'chicken'},
        {'avg_temp_c': 35.0, 'humidity_percent': 85, 'transport_duration_hr': 24, 'product_type': 'mango'},
    ]
    print('\n' + '='*65)
    for t in tests:
        r = predict(t)
        print(f"{t['product_type']:<10} @{t['avg_temp_c']:>5}°C | {t['transport_duration_hr']:>2}hrs → "
              f"Risk:{r['risk_level']:<8} Quality:{r['quality_remaining']:>5.1f}% "
              f"Shelf:{r['hours_to_spoilage']:>5.1f}hrs")
    print('='*65)