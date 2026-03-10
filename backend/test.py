# Create test.py file with:
import joblib
scaler = joblib.load('ml_model/models/scaler.pkl')
print(scaler.feature_names_in_)

