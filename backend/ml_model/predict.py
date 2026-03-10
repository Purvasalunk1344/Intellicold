"""
IntelliCold - ABSOLUTE FINAL Prediction Module

SCALER expects 20 features:
1-17: Basic features + derived features
18. spoilage_rate_per_hr  
19. spoilage_probability
20. remaining_shelf_life_hours

PLUS during training, these were added but later dropped:
- action_encoded (placeholder for prediction)
- risk_encoded (placeholder for prediction)

The scaler was fitted on data that had action_encoded and risk_encoded!
We must generate them (as 0) for the scaler, then drop them for the model.

MODEL expects 21 features:
- Same 20 as scaler BUT without action_encoded and risk_encoded
- Plus temp_danger_flag at position 18
"""

import numpy as np
import pandas as pd
import joblib
import os
from typing import Dict, Any

# ══════════════════════════════════════════════════════════════
# LOAD MODELS
# ══════════════════════════════════════════════════════════════

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_BASE_DIR, 'models')

print(f"Loading models from: {_MODELS_DIR}")

try:
    risk_model = joblib.load(os.path.join(_MODELS_DIR, 'risk_model.pkl'))
    scaler = joblib.load(os.path.join(_MODELS_DIR, 'scaler.pkl'))
    
    try:
        package = joblib.load(os.path.join(_MODELS_DIR, 'intellicold_model_package.pkl'))
        if isinstance(package, dict) and 'model' in package:
            quality_model = package['model']
            time_model = package['model']
            action_model = risk_model
        else:
            quality_model = risk_model
            time_model = risk_model
            action_model = risk_model
    except:
        quality_model = risk_model
        time_model = risk_model
        action_model = risk_model
    
    print("[OK] All models loaded successfully!")
    
except Exception as e:
    print(f"[ERROR] Error loading models: {e}")
    raise

# ══════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════

RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical']

ACTION_MAP = {
    0: '[OK] Maintain current cooling settings - Product is stable',
    1: '[WARNING] Increase cooling intensity - Temperature trending upward',
    2: '[ALERT] Expedite delivery - Quality degrading faster than expected',
    3: '[CRITICAL] CRITICAL: Activate emergency protocols - Immediate intervention required'
}

PRODUCT_SAFE_TEMPS = {
    'milk': {'low': 2, 'mid': 4, 'high': 6},
    'meat': {'low': 0, 'mid': 2, 'high': 4},
    'vegetables': {'low': 8, 'mid': 10, 'high': 12},
    'fish': {'low': -2, 'mid': 0, 'high': 2},
    'fruits': {'low': 6, 'mid': 8, 'high': 10},
    'dairy': {'low': 2, 'mid': 4, 'high': 6},
    'vaccines': {'low': 2, 'mid': 4, 'high': 8},
}

# ══════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════

def engineer_features(backend_data: Dict[str, Any]) -> tuple:
    """Generate features matching scaler's expectations"""
    
    temperature = float(backend_data.get('avg_temp_c', 5.0))
    humidity = float(backend_data.get('humidity_percent', 70.0))
    exposure_hrs = float(backend_data.get('transport_duration_hr', 12.0))
    product_type = backend_data.get('product_type', 'milk').lower()
    
    safe_temps = PRODUCT_SAFE_TEMPS.get(product_type, PRODUCT_SAFE_TEMPS['milk'])
    safe_temp_low = safe_temps['low']
    safe_temp_mid = safe_temps['mid']
    safe_temp_high = safe_temps['high']
    
    humidity_low = 60.0
    humidity_mid = 75.0
    humidity_high = 85.0
    
    ethylene_ppm = float(backend_data.get('ethylene_ppm', 5.0))
    co2_ppm = float(backend_data.get('co2_ppm', 500.0))
    nh3_ppm = float(backend_data.get('nh3_ppm', 2.0))
    h2s_ppm = float(backend_data.get('h2s_ppm', 0.2))
    
    temp_deviation = temperature - safe_temp_mid
    temp_deviation_degree_hr = temp_deviation * exposure_hrs
    humidity_deviation = humidity - humidity_mid
    cumulative_damage_index = abs(temp_deviation_degree_hr) / 100.0
    
    spoilage_rate_per_hr = max(0, temp_deviation * 0.01) if temp_deviation > 0 else 0
    spoilage_probability = min(1.0, spoilage_rate_per_hr * exposure_hrs)
    remaining_shelf_life_hours = max(0, (1.0 - spoilage_probability) * 100.0)
    
    temp_danger_flag = 1 if temperature > safe_temp_high else 0
    
    # Create 22 features including action_encoded and risk_encoded for scaler
    # (scaler was fitted on data that had these columns from step4)
    features = pd.DataFrame([{
        'temperature_C': temperature,
        'humidity_percent': humidity,
        'safe_temp_low_C': safe_temp_low,
        'safe_temp_mid_C': safe_temp_mid,
        'safe_temp_high_C': safe_temp_high,
        'humidity_low_percent': humidity_low,
        'humidity_mid_percent': humidity_mid,
        'humidity_high_percent': humidity_high,
        'exposure_hours': exposure_hrs,
        'ethylene_ppm': ethylene_ppm,
        'co2_ppm': co2_ppm,
        'nh3_ppm': nh3_ppm,
        'h2s_ppm': h2s_ppm,
        'temp_deviation': temp_deviation,
        'temp_deviation_degree_hr': temp_deviation_degree_hr,
        'cumulative_damage_index': cumulative_damage_index,
        'humidity_deviation': humidity_deviation,
        'spoilage_rate_per_hr': spoilage_rate_per_hr,
        'spoilage_probability': spoilage_probability,
        'remaining_shelf_life_hours': remaining_shelf_life_hours,
        'risk_encoded': 0,      # Placeholder
        'action_encoded': 0,    # Placeholder
    }])
    
    # Reorder to match scaler's expected order
    if hasattr(scaler, 'feature_names_in_'):
        features = features[scaler.feature_names_in_]
    
    return features, temp_danger_flag


# ══════════════════════════════════════════════════════════════
# PREDICTION
# ══════════════════════════════════════════════════════════════

def predict(features: Dict[str, Any]) -> Dict[str, Any]:
    """Main prediction function"""
    
    X_for_scaler, temp_danger_flag = engineer_features(features)
    
    # Scale
    X_scaled = scaler.transform(X_for_scaler)
    X_scaled_df = pd.DataFrame(X_scaled, columns=X_for_scaler.columns)
    
    # Drop action_encoded and risk_encoded (they were only for scaler)
    X_no_encoded = X_scaled_df.drop(columns=['action_encoded', 'risk_encoded'], errors='ignore')
    
    # Insert temp_danger_flag at position 18 for model
    model_features = pd.DataFrame()
    
    # First 17 columns
    for col in list(X_no_encoded.columns[:17]):
        model_features[col] = X_no_encoded[col]
    
    # Insert temp_danger_flag
    model_features['temp_danger_flag'] = [temp_danger_flag]
    
    # Remaining columns
    for col in list(X_no_encoded.columns[17:]):
        model_features[col] = X_no_encoded[col]
    
    # Predict
    risk_idx = int(risk_model.predict(model_features)[0])
    risk_probs = risk_model.predict_proba(model_features)[0]
    
    quality_remaining = (1.0 - X_for_scaler['spoilage_probability'].values[0]) * 100.0
    hours_to_spoilage = X_for_scaler['remaining_shelf_life_hours'].values[0]
    
    action_idx = min(risk_idx, 3)
    risk_idx = max(0, min(3, risk_idx))
    quality_remaining = max(0.0, min(100.0, quality_remaining))
    
    return {
        'quality_remaining': round(quality_remaining, 1),
        'risk_level': RISK_LEVELS[risk_idx],
        'risk_index': risk_idx,
        'hours_to_spoilage': round(max(0, hours_to_spoilage), 1),
        'recommended_action': ACTION_MAP.get(action_idx, ACTION_MAP[0]),
        'risk_probabilities': {
            'Low': round(float(risk_probs[0]), 3),
            'Medium': round(float(risk_probs[1]), 3),
            'High': round(float(risk_probs[2]), 3),
            'Critical': round(float(risk_probs[3]), 3),
        }
    }


if __name__ == "__main__":
    print("\n" + "="*60)
    print("TESTING PREDICTION")
    print("="*60)
    
    test_data = {
        'avg_temp_c': 5.0,
        'humidity_percent': 70.0,
        'transport_duration_hr': 12.0,
        'product_type': 'milk'
    }
    
    result = predict(test_data)
    print("\nPrediction successful!")
    for k, v in result.items():
        if k != 'risk_probabilities':
            print(f"  {k}: {v}")