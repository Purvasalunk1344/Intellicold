"""
Detailed diagnostic to find the exact mismatch
"""

import joblib
import os
import sys

# Add the ml_model directory to path
backend_path = os.path.dirname(os.path.abspath(__file__))
ml_model_path = os.path.join(backend_path, 'ml_model')
sys.path.insert(0, ml_model_path)

print("="*70)
print("DETAILED FEATURE MISMATCH DIAGNOSTIC")
print("="*70)

# Load scaler to see what it expects
models_dir = os.path.join(ml_model_path, 'models')
scaler = joblib.load(os.path.join(models_dir, 'scaler.pkl'))

print(f"\n📊 SCALER EXPECTS {scaler.n_features_in_} FEATURES:")
print("-"*70)

expected_features = list(scaler.feature_names_in_)
for i, name in enumerate(expected_features, 1):
    print(f"{i:2d}. {name}")

# Now test what predict.py is generating
print("\n" + "="*70)
print("TESTING predict.py FEATURE GENERATION")
print("="*70)

try:
    from ml_model.predict import engineer_features
    
    test_data = {
        'avg_temp_c': 5.0,
        'humidity_percent': 70.0,
        'transport_duration_hr': 12.0,
        'product_type': 'milk',
        'ethylene_ppm': 5.0,
        'co2_ppm': 500.0,
        'nh3_ppm': 2.0,
        'h2s_ppm': 0.2
    }
    
    X = engineer_features(test_data)
    actual_features = list(X.columns)
    
    print(f"\n📊 PREDICT.PY GENERATES {len(actual_features)} FEATURES:")
    print("-"*70)
    for i, name in enumerate(actual_features, 1):
        print(f"{i:2d}. {name}")
    
    # Compare
    print("\n" + "="*70)
    print("COMPARISON")
    print("="*70)
    
    print(f"\nExpected: {len(expected_features)} features")
    print(f"Actual:   {len(actual_features)} features")
    print(f"Match:    {len(expected_features) == len(actual_features)}")
    
    # Find missing features
    missing = set(expected_features) - set(actual_features)
    if missing:
        print(f"\n❌ MISSING FEATURES ({len(missing)}):")
        for feat in sorted(missing):
            print(f"   - {feat}")
    
    # Find extra features
    extra = set(actual_features) - set(expected_features)
    if extra:
        print(f"\n❌ EXTRA FEATURES ({len(extra)}):")
        for feat in sorted(extra):
            print(f"   - {feat}")
    
    # Check order
    if len(expected_features) == len(actual_features):
        print("\n📋 FEATURE ORDER COMPARISON:")
        print("-"*70)
        order_matches = True
        for i, (exp, act) in enumerate(zip(expected_features, actual_features), 1):
            match = "✅" if exp == act else "❌"
            if exp != act:
                order_matches = False
            print(f"{i:2d}. {match} Expected: {exp:30s} | Actual: {act}")
        
        if order_matches:
            print("\n✅ Feature order matches!")
        else:
            print("\n❌ Feature order does NOT match!")
    
    if not missing and not extra and order_matches:
        print("\n" + "="*70)
        print("🎉 SUCCESS! Features match perfectly!")
        print("="*70)
    else:
        print("\n" + "="*70)
        print("❌ MISMATCH FOUND - Fix the issues above")
        print("="*70)
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()