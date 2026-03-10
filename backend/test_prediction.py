# Test script: backend/test_prediction.py
from backend.ml_model.predict import predict

test_features = {
    'avg_temp_c': 5.0,
    'humidity_percent': 70.0,
    'transport_duration_hr': 12.0,
    'nh3_ppm': 2.0,
    'h2s_ppm': 0.2,
    'co2_ppm': 500.0,
    'ethylene_ppm': 5.0,
    'temp_deviation': 1.0,
    'temp_deviation_degree_hr': 12.0,
    'cumulative_damage_index': 0.12,
    'humidity_deviation': 0.0,
    'temp_danger_flag': 0
}

result = predict(test_features)
print("Prediction result:")
print(result)