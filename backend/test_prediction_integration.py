"""
Test script for predict.py integration
Tests the complete prediction pipeline with various scenarios
"""

import sys
import os

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend', 'ml_model')
sys.path.insert(0, backend_path)

try:
    from backend.ml_model.predict import predict, engineer_features
    print("✅ Successfully imported predict module")
except ImportError as e:
    print(f"❌ Failed to import predict module: {e}")
    sys.exit(1)

print("\n" + "="*70)
print("INTELLICOLD - PREDICTION MODULE INTEGRATION TEST")
print("="*70)

# Test scenarios
test_scenarios = [
    {
        'name': 'Low Risk - Milk (Optimal Conditions)',
        'data': {
            'avg_temp_c': 3.5,
            'humidity_percent': 70.0,
            'transport_duration_hr': 8.0,
            'product_type': 'milk',
            'ethylene_ppm': 3.0,
            'co2_ppm': 450.0,
            'nh3_ppm': 1.5,
            'h2s_ppm': 0.1
        }
    },
    {
        'name': 'Medium Risk - Meat (Slightly Elevated Temp)',
        'data': {
            'avg_temp_c': 5.0,
            'humidity_percent': 75.0,
            'transport_duration_hr': 12.0,
            'product_type': 'meat',
            'ethylene_ppm': 8.0,
            'co2_ppm': 600.0,
            'nh3_ppm': 3.0,
            'h2s_ppm': 0.3
        }
    },
    {
        'name': 'High Risk - Fish (Temperature Abuse)',
        'data': {
            'avg_temp_c': 6.0,
            'humidity_percent': 85.0,
            'transport_duration_hr': 18.0,
            'product_type': 'fish',
            'ethylene_ppm': 12.0,
            'co2_ppm': 800.0,
            'nh3_ppm': 5.0,
            'h2s_ppm': 0.8
        }
    },
    {
        'name': 'Critical Risk - Vaccines (Major Deviation)',
        'data': {
            'avg_temp_c': 12.0,
            'humidity_percent': 90.0,
            'transport_duration_hr': 24.0,
            'product_type': 'vaccines',
            'ethylene_ppm': 20.0,
            'co2_ppm': 1000.0,
            'nh3_ppm': 8.0,
            'h2s_ppm': 1.5
        }
    },
    {
        'name': 'Normal - Vegetables (Standard Transport)',
        'data': {
            'avg_temp_c': 10.0,
            'humidity_percent': 80.0,
            'transport_duration_hr': 10.0,
            'product_type': 'vegetables',
            'ethylene_ppm': 6.0,
            'co2_ppm': 550.0,
            'nh3_ppm': 2.0,
            'h2s_ppm': 0.2
        }
    }
]

# Run tests
print("\n📋 Running Test Scenarios...")
print("="*70)

all_passed = True

for i, scenario in enumerate(test_scenarios, 1):
    print(f"\n🧪 Test {i}: {scenario['name']}")
    print("-" * 70)
    
    try:
        # Test feature engineering
        features_df = engineer_features(scenario['data'])
        print(f"✅ Feature engineering: {len(features_df.columns)} features generated")
        
        # Test prediction
        result = predict(scenario['data'])
        
        # Validate result structure
        required_keys = [
            'quality_remaining',
            'risk_level',
            'risk_index',
            'hours_to_spoilage',
            'recommended_action',
            'risk_probabilities'
        ]
        
        missing_keys = [key for key in required_keys if key not in result]
        if missing_keys:
            print(f"❌ Missing keys in result: {missing_keys}")
            all_passed = False
            continue
        
        # Display results
        print(f"\n📊 Predictions:")
        print(f"   Quality Remaining: {result['quality_remaining']}%")
        print(f"   Risk Level: {result['risk_level']} (index: {result['risk_index']})")
        print(f"   Hours to Spoilage: {result['hours_to_spoilage']} hrs")
        print(f"   Action: {result['recommended_action']}")
        
        print(f"\n📈 Risk Distribution:")
        for risk_name, prob in result['risk_probabilities'].items():
            bar = "█" * int(prob * 50)
            print(f"   {risk_name:8s}: {prob:.1%} {bar}")
        
        # Validate data ranges
        validations = [
            (0 <= result['quality_remaining'] <= 100, "Quality in range 0-100"),
            (0 <= result['risk_index'] <= 3, "Risk index in range 0-3"),
            (result['hours_to_spoilage'] >= 0, "Hours to spoilage non-negative"),
            (result['risk_level'] in ['Low', 'Medium', 'High', 'Critical'], "Valid risk level"),
            (abs(sum(result['risk_probabilities'].values()) - 1.0) < 0.01, "Probabilities sum to 1.0")
        ]
        
        test_passed = True
        for condition, description in validations:
            if not condition:
                print(f"   ❌ Validation failed: {description}")
                test_passed = False
                all_passed = False
        
        if test_passed:
            print(f"\n✅ Test {i} PASSED")
        else:
            print(f"\n❌ Test {i} FAILED")
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False

# Summary
print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)

if all_passed:
    print("✅ ALL TESTS PASSED - Integration successful!")
    print("\n🎯 Next steps:")
    print("   1. Integrate predict.py with app.py API endpoint")
    print("   2. Test with real shipment data")
    print("   3. Verify frontend receives correct format")
else:
    print("❌ SOME TESTS FAILED - Review errors above")

print("\n" + "="*70)