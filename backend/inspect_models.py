"""
Inspect trained models to see what features they expect
This will help us fix the feature mismatch issue
"""

import joblib
import os

backend_path = r'C:\Users\sukhada\intellicold\backend\ml_model'
models_dir = os.path.join(backend_path, 'models')

print("="*70)
print("INSPECTING TRAINED MODELS")
print("="*70)

try:
    # Load scaler to see what features it was fitted on
    scaler_path = os.path.join(models_dir, 'scaler.pkl')
    scaler = joblib.load(scaler_path)
    
    print("\n📊 SCALER INFORMATION:")
    print(f"   Number of features: {scaler.n_features_in_}")
    
    if hasattr(scaler, 'feature_names_in_'):
        print(f"\n   Expected feature names ({len(scaler.feature_names_in_)}):")
        for i, name in enumerate(scaler.feature_names_in_, 1):
            print(f"      {i:2d}. {name}")
    else:
        print("   ⚠️  No feature names stored in scaler")
    
    # Load one of the models to check
    print("\n" + "="*70)
    risk_model = joblib.load(os.path.join(models_dir, 'risk_model.pkl'))
    print("📊 RISK MODEL INFORMATION:")
    print(f"   Model type: {type(risk_model).__name__}")
    print(f"   Number of features expected: {risk_model.n_features_in_}")
    
    if hasattr(risk_model, 'feature_names_in_'):
        print(f"\n   Expected feature names ({len(risk_model.feature_names_in_)}):")
        for i, name in enumerate(risk_model.feature_names_in_, 1):
            print(f"      {i:2d}. {name}")
    
    # Also check the quality model
    print("\n" + "="*70)
    quality_model = joblib.load(os.path.join(models_dir, 'quality_model.pkl'))
    print("📊 QUALITY MODEL INFORMATION:")
    print(f"   Model type: {type(quality_model).__name__}")
    print(f"   Number of features expected: {quality_model.n_features_in_}")
    
    if hasattr(quality_model, 'feature_names_in_'):
        print(f"\n   Expected feature names ({len(quality_model.feature_names_in_)}):")
        for i, name in enumerate(quality_model.feature_names_in_, 1):
            print(f"      {i:2d}. {name}")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("NEXT STEPS:")
print("="*70)
print("1. Compare the feature names above with predict.py")
print("2. Update engineer_features() to match exactly")
print("3. Ensure features are in the same order")
print("="*70)