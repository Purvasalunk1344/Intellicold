"""
IntelliCold — Prediction Module
================================
Loads the 4 real-data trained models and exposes a single predict() function
that the Flask backend calls for every shipment update.
"""

import numpy as np
import pandas as pd
import joblib
import os

# ── Load models (once at import time) ─────────────────────────────────────────
_BASE = os.path.dirname(__file__)

risk_clf   = joblib.load(os.path.join(_BASE, 'classifier.pkl'))
qual_reg   = joblib.load(os.path.join(_BASE, 'quality_reg.pkl'))
time_reg   = joblib.load(os.path.join(_BASE, 'time_reg.pkl'))
action_clf = joblib.load(os.path.join(_BASE, 'action_clf.pkl'))
encoders   = joblib.load(os.path.join(_BASE, 'encoders.pkl'))

FEATURES    = encoders['features']
RISK_NAMES  = encoders['risk_names']    # ['Low','Medium','High','Critical']
RISK_ORDER  = encoders['risk_order']    # {'low':0,...}
ACTION_LE   = encoders['action_le']

# ── Categorical maps ───────────────────────────────────────────────────────────
VEHICLE_MAP = {'reefer_truck': 0, 'insulated_van': 1, 'open_truck': 2}
PRODUCT_MAP = {
    'milk': 0, 'yogurt': 0,
    'meat': 1,
    'seafood': 2, 'fish': 2,
    'vaccine': 3,
    'fruit': 4,
    'vegetable': 5,
}

# ── Action label normaliser (bridges KAGGLE vs ACM naming) ────────────────────
ACTION_DISPLAY = {
    'maintain_cooling'              : '✅ Maintain current cooling settings',
    'reduce_temp_setpoint'          : '🔶 Reduce temperature setpoint — cool down now',
    'expedite_delivery'             : '⚠️ Expedite delivery — increase transport priority',
    'EMERGENCY: Immediate delivery / discard': '🚨 EMERGENCY: Deliver immediately or discard',
    'Expedite shipment, increase cooling'    : '⚠️ Expedite shipment and increase cooling',
    'Monitor closely, check route ETA'       : '🔶 Monitor closely — check route ETA',
    'No action required'                     : '✅ No action required — conditions nominal',
}


def _build_feature_row(f: dict) -> pd.DataFrame:
    """Convert raw sensor dict → engineered feature DataFrame."""
    avg_temp  = float(f.get('avg_temp_c',  f.get('avg_temp', 5.0)))
    max_temp  = float(f.get('max_temp_c',  avg_temp + 2.0))
    orig_temp = float(f.get('origin_temp_c', avg_temp - 1.0))
    humidity  = float(f.get('humidity_percent', f.get('humidity', 70.0)))
    duration  = float(f.get('transport_duration_hr', f.get('transit_hours', 12.0)))
    distance  = float(f.get('distance_km', 300.0))
    nh3       = float(f.get('nh3_ppm', 2.0))
    h2s       = float(f.get('h2s_ppm', 0.2))
    co2       = float(f.get('co2_ppm', 500.0))
    ethylene  = float(f.get('ethylene_ppm', 5.0))
    temp_dev  = float(f.get('temp_deviation_degree_hr', f.get('hours_above_safe', 0) * 3))
    cdi       = float(f.get('cumulative_damage_index', temp_dev * 0.02))
    vehicle   = f.get('vehicle_type', 'reefer_truck')
    product   = f.get('product_type', 'milk')

    row = {
        'avg_temp_c'              : avg_temp,
        'max_temp_c'              : max_temp,
        'origin_temp_c'           : orig_temp,
        'humidity_percent'        : humidity,
        'transport_duration_hr'   : duration,
        'distance_km'             : distance,
        'nh3_ppm'                 : nh3,
        'h2s_ppm'                 : h2s,
        'co2_ppm'                 : co2,
        'ethylene_ppm'            : ethylene,
        'temp_deviation_degree_hr': temp_dev,
        'cumulative_damage_index' : cdi,
        # Derived
        'temp_range'              : max_temp - avg_temp,
        'temp_excess'             : max(0, avg_temp - 4),
        'speed_kmph'              : distance / max(duration, 0.1),
        'gas_stress_index'        : nh3 * 0.4 + h2s * 2 + ethylene * 0.1,
        'thermal_load'            : temp_dev * humidity / 100,
        'distance_per_temp'       : distance / (abs(avg_temp) + 1),
        'vehicle_enc'             : VEHICLE_MAP.get(vehicle, 1),
        'product_enc'             : PRODUCT_MAP.get(product.lower(), 4),
    }
    return pd.DataFrame([row])[FEATURES]


def predict(features: dict) -> dict:
    """
    Accepts a flat dict of sensor/shipment features.
    Returns structured prediction dict ready for the backend API.

    Required keys (at minimum):
        avg_temp_c, humidity_percent, transport_duration_hr,
        distance_km, product_type

    Optional (auto-estimated if missing):
        max_temp_c, origin_temp_c, nh3_ppm, h2s_ppm, co2_ppm,
        ethylene_ppm, temp_deviation_degree_hr, cumulative_damage_index,
        vehicle_type
    """
    X = _build_feature_row(features)

    risk_idx  = int(risk_clf.predict(X)[0])
    quality   = float(np.clip(qual_reg.predict(X)[0],   0, 100))
    t_spoil   = float(np.clip(time_reg.predict(X)[0],   0, 72))
    act_raw   = ACTION_LE.inverse_transform(action_clf.predict(X))[0]

    # Risk probabilities for confidence display
    risk_probs = risk_clf.predict_proba(X)[0].tolist()

    return {
        'quality_remaining' : round(quality, 1),
        'risk_level'        : RISK_NAMES[risk_idx],          # 'Low'|'Medium'|'High'|'Critical'
        'risk_index'        : risk_idx,                       # 0-3
        'risk_probabilities': {RISK_NAMES[i]: round(p, 3) for i, p in enumerate(risk_probs) if i < len(RISK_NAMES)},
        'hours_to_spoilage' : round(t_spoil, 1),
        'recommended_action': ACTION_DISPLAY.get(act_raw, act_raw),
        'raw_action'        : act_raw,
    }