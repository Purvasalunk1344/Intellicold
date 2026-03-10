"""
Test the ML prediction API endpoints
Run this AFTER starting your Flask server
"""

import requests
import json

BASE_URL = "http://localhost:5000"

print("="*70)
print("TESTING INTELLICOLD ML API ENDPOINTS")
print("="*70)

# ══════════════════════════════════════════════════════════════
# Test 1: Health Check
# ══════════════════════════════════════════════════════════════

print("\n🧪 Test 1: Health Check")
print("-"*70)

try:
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        print("✅ Health check PASSED")
    else:
        print("❌ Health check FAILED")
except Exception as e:
    print(f"❌ Error: {e}")

# ══════════════════════════════════════════════════════════════
# Test 2: General Prediction Endpoint
# ══════════════════════════════════════════════════════════════

print("\n🧪 Test 2: General Prediction (/api/predict)")
print("-"*70)

test_data = {
    "avg_temp_c": 5.0,
    "humidity_percent": 70.0,
    "transport_duration_hr": 12.0,
    "product_type": "milk",
    "ethylene_ppm": 5.0,
    "co2_ppm": 500.0,
    "nh3_ppm": 2.0,
    "h2s_ppm": 0.2
}

try:
    response = requests.post(
        f"{BASE_URL}/api/predict",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200 and response.json()['success']:
        print("✅ Prediction endpoint PASSED")
        
        # Display prediction results
        pred = response.json()['prediction']
        print(f"\n📊 Prediction Results:")
        print(f"   Quality: {pred['quality_remaining']}%")
        print(f"   Risk: {pred['risk_level']}")
        print(f"   Time to Spoilage: {pred['hours_to_spoilage']} hours")
        print(f"   Action: {pred['recommended_action']}")
    else:
        print("❌ Prediction endpoint FAILED")
except Exception as e:
    print(f"❌ Error: {e}")

# ══════════════════════════════════════════════════════════════
# Test 3: Shipment Prediction Endpoint
# ══════════════════════════════════════════════════════════════

print("\n🧪 Test 3: Shipment Prediction (/api/shipments/123/predict)")
print("-"*70)

try:
    response = requests.get(f"{BASE_URL}/api/shipments/123/predict")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200 and response.json()['success']:
        print("✅ Shipment prediction PASSED")
    else:
        print("❌ Shipment prediction FAILED")
except Exception as e:
    print(f"❌ Error: {e}")

# ══════════════════════════════════════════════════════════════
# Test 4: Monitor Update Endpoint (High Risk Scenario)
# ══════════════════════════════════════════════════════════════

print("\n🧪 Test 4: Monitor Update - High Risk (/api/shipments/123/monitor)")
print("-"*70)

high_risk_data = {
    "temperature": 12.0,  # High temp!
    "humidity": 90.0,
    "ethylene": 20.0,
    "co2": 1000.0,
    "nh3": 8.0,
    "h2s": 1.5
}

try:
    response = requests.post(
        f"{BASE_URL}/api/shipments/123/monitor",
        json=high_risk_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200 and response.json()['success']:
        print("✅ Monitor update PASSED")
        
        if response.json()['alert_triggered']:
            print("⚠️  ALERT TRIGGERED (as expected for high risk)")
    else:
        print("❌ Monitor update FAILED")
except Exception as e:
    print(f"❌ Error: {e}")

# ══════════════════════════════════════════════════════════════
# Test 5: Different Product Types
# ══════════════════════════════════════════════════════════════

print("\n🧪 Test 5: Testing Different Product Types")
print("-"*70)

product_types = ['milk', 'meat', 'fish', 'vegetables', 'vaccines']

for product in product_types:
    test_data['product_type'] = product
    try:
        response = requests.post(
            f"{BASE_URL}/api/predict",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            pred = response.json()['prediction']
            print(f"✅ {product:12s}: Risk={pred['risk_level']:8s} Quality={pred['quality_remaining']:5.1f}%")
        else:
            print(f"❌ {product:12s}: FAILED")
    except Exception as e:
        print(f"❌ {product:12s}: Error - {e}")

# ══════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════

print("\n" + "="*70)
print("TEST SUMMARY")
print("="*70)
print("\nAll endpoints tested!")
print("Check the results above for any failures.")
print("\n" + "="*70)