"""
Check EXACT scaler features to determine which one to remove
"""

import joblib
import os

backend_path = r'C:\Users\sukhada\intellicold\backend\ml_model'
models_dir = os.path.join(backend_path, 'models')

print("="*70)
print("CHECKING SCALER FEATURES")
print("="*70)

# Load scaler
scaler = joblib.load(os.path.join(models_dir, 'scaler.pkl'))

print(f"\n📊 Scaler expects: {scaler.n_features_in_} features")
print(f"\nFeature names ({len(scaler.feature_names_in_)}):")
print("-"*70)

for i, name in enumerate(scaler.feature_names_in_, 1):
    print(f"{i:2d}. {name}")

print("\n" + "="*70)
print("CHECKING ONE MODEL")
print("="*70)

risk_model = joblib.load(os.path.join(models_dir, 'risk_model.pkl'))
print(f"\nRisk model expects: {risk_model.n_features_in_} features")

print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"Scaler features: {scaler.n_features_in_}")
print(f"Model features: {risk_model.n_features_in_}")

if scaler.n_features_in_ != risk_model.n_features_in_:
    print("\n⚠️  WARNING: Scaler and model have different feature counts!")
else:
    print(f"\n✅ Both expect {scaler.n_features_in_} features")

print("\n" + "="*70)