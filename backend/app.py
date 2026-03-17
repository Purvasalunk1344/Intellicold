# """
# IntelliCold — FastAPI Backend (FIXED VERSION)
# Run: python app.py
# API runs on http://localhost:5000

# FIXES:
# 1. Updated Pydantic .dict() to .model_dump() (Pydantic V2)
# 2. Fixed feature count to match models (20 features, not 21)
# 3. Removed duplicate model definitions
# """

# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# import sqlite3, os, sys, random
# from datetime import datetime
# import uvicorn
# from typing import Optional
# from pydantic import BaseModel

# # ── Import ML modules ──
# sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml_model'))
# from ml_model.predict import predict
# from ml_model.decision_engine import get_actions, prioritize_shipments

# app = FastAPI()

# # CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# DB_PATH = os.path.join(os.path.dirname(__file__), 'sensor_data.db')

# # ══════════════════════════════════════════════════════════════
# # PYDANTIC MODELS
# # ══════════════════════════════════════════════════════════════

# class RouteRequest(BaseModel):
#     origin: str
#     destination: str
#     shipment_id: Optional[str] = None
#     vehicle_type: Optional[str] = "reefer_truck"
#     distance_km: Optional[float] = 0

# class EmissionRequest(BaseModel):
#     distance_km: float
#     vehicle_type: str = "reefer_truck"

# class PredictionRequest(BaseModel):
#     avg_temp_c: float
#     humidity_percent: float
#     transport_duration_hr: float
#     product_type: str
#     ethylene_ppm: Optional[float] = 5.0
#     co2_ppm: Optional[float] = 500.0
#     nh3_ppm: Optional[float] = 2.0
#     h2s_ppm: Optional[float] = 0.2

# class SensorUpdateRequest(BaseModel):
#     temperature: float
#     humidity: float
#     ethylene: Optional[float] = 5.0
#     co2: Optional[float] = 500.0
#     nh3: Optional[float] = 2.0
#     h2s: Optional[float] = 0.2

# # ══════════════════════════════════════════════════════════════
# # DATABASE FUNCTIONS
# # ══════════════════════════════════════════════════════════════

# def init_db():
#     conn = sqlite3.connect(DB_PATH)
#     c = conn.cursor()
#     c.execute('''
#         CREATE TABLE IF NOT EXISTS sensor_readings (
#             id INTEGER PRIMARY KEY AUTOINCREMENT,
#             shipment_id TEXT NOT NULL,
#             timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
#             temperature REAL,
#             humidity REAL
#         )
#     ''')
#     c.execute('''
#         CREATE TABLE IF NOT EXISTS shipments (
#             id TEXT PRIMARY KEY,
#             name TEXT,
#             origin TEXT,
#             destination TEXT,
#             distance_km REAL,
#             product_type TEXT,
#             started_at DATETIME DEFAULT CURRENT_TIMESTAMP
#         )
#     ''')
#     conn.commit()
#     conn.close()

# def insert_reading(shipment_id, temperature, humidity):
#     conn = sqlite3.connect(DB_PATH)
#     conn.execute(
#         'INSERT INTO sensor_readings (shipment_id, temperature, humidity) VALUES (?,?,?)',
#         (shipment_id, temperature, humidity)
#     )
#     conn.commit()
#     conn.close()

# def get_readings(shipment_id, limit=50):
#     conn = sqlite3.connect(DB_PATH)
#     rows = conn.execute(
#         '''SELECT timestamp, temperature, humidity
#            FROM sensor_readings
#            WHERE shipment_id=?
#            ORDER BY timestamp DESC LIMIT ?''',
#         (shipment_id, limit)
#     ).fetchall()
#     conn.close()
#     return [{'timestamp': r[0], 'temperature': r[1], 'humidity': r[2]} for r in rows]

# # ══════════════════════════════════════════════════════════════
# # DEMO DATA
# # ══════════════════════════════════════════════════════════════

# DEMO_SHIPMENTS = [
#     {'id': 'S001', 'name': 'Vaccine Batch A', 'origin': 'Mumbai', 'destination': 'Delhi',
#      'distance_km': 1400, 'product_type': 'vaccines', 'vehicle_type': 'reefer_truck'},
#     {'id': 'S002', 'name': 'Dairy Cargo B', 'origin': 'Pune', 'destination': 'Nashik',
#      'distance_km': 210, 'product_type': 'milk', 'vehicle_type': 'insulated_van'},
#     {'id': 'S003', 'name': 'Pharma Lot C', 'origin': 'Surat', 'destination': 'Chennai',
#      'distance_km': 1460, 'product_type': 'meat', 'vehicle_type': 'open_truck'},
# ]

# sim_state = {
#     'S001': {'avg_temp_c': 3.5, 'max_temp_c': 5.0, 'origin_temp_c': 2.0,
#              'humidity_percent': 60, 'transport_duration_hr': 4, 'distance_km': 1400,
#              'vehicle_type': 'reefer_truck', 'product_type': 'vaccines',
#              'nh3_ppm': 1.0, 'h2s_ppm': 0.05, 'co2_ppm': 400, 'ethylene_ppm': 0.5,
#              'temp_deviation_degree_hr': 2.0, 'cumulative_damage_index': 0.05},
#     'S002': {'avg_temp_c': 7.0, 'max_temp_c': 12.0, 'origin_temp_c': 4.0,
#              'humidity_percent': 78, 'transport_duration_hr': 18, 'distance_km': 210,
#              'vehicle_type': 'insulated_van', 'product_type': 'milk',
#              'nh3_ppm': 4.0, 'h2s_ppm': 0.4, 'co2_ppm': 550, 'ethylene_ppm': 5.0,
#              'temp_deviation_degree_hr': 25.0, 'cumulative_damage_index': 0.4},
#     'S003': {'avg_temp_c': 10.5, 'max_temp_c': 15.0, 'origin_temp_c': 3.0,
#              'humidity_percent': 85, 'transport_duration_hr': 36, 'distance_km': 1460,
#              'vehicle_type': 'open_truck', 'product_type': 'meat',
#              'nh3_ppm': 8.0, 'h2s_ppm': 1.2, 'co2_ppm': 700, 'ethylene_ppm': 0.0,
#              'temp_deviation_degree_hr': 90.0, 'cumulative_damage_index': 2.8},
# }

# def evolve_state(sid):
#     s = sim_state[sid]
#     s['avg_temp_c'] = round(s['avg_temp_c'] + random.uniform(-0.1, 0.25), 2)
#     s['max_temp_c'] = round(max(s['max_temp_c'], s['avg_temp_c'] + random.uniform(0.5, 1.5)), 2)
#     s['humidity_percent'] = round(min(99, max(40, s['humidity_percent'] + random.uniform(-0.5, 0.5))), 1)
#     s['transport_duration_hr'] = round(s['transport_duration_hr'] + 0.083, 2)
#     s['temp_deviation_degree_hr'] = round(s['temp_deviation_degree_hr'] + (0.5 if s['avg_temp_c'] > 4 else 0), 2)
#     s['cumulative_damage_index'] = round(s['cumulative_damage_index'] + (0.01 if s['avg_temp_c'] > 4 else 0), 3)
#     s['nh3_ppm'] = round(max(0, s['nh3_ppm'] + random.uniform(-0.05, 0.1)), 2)
#     return s

# # ══════════════════════════════════════════════════════════════
# # EXISTING API ROUTES
# # ══════════════════════════════════════════════════════════════

# @app.post("/api/sensor")
# async def receive_sensor(data: dict):
#     sid = data.get('shipment_id', 'S001')
#     temp = float(data['temperature'])
#     hum = float(data['humidity'])
#     insert_reading(sid, temp, hum)
#     if sid in sim_state:
#         sim_state[sid]['avg_temp_c'] = temp
#         sim_state[sid]['humidity_percent'] = hum
#     return {'status': 'ok', 'message': 'Reading saved'}

# @app.get("/api/shipments")
# async def get_shipments_endpoint():
#     result = []
#     for ship in DEMO_SHIPMENTS:
#         sid = ship['id']
#         state = evolve_state(sid)
#         pred = predict(state)
#         actions = get_actions(pred, ship['distance_km'])
#         readings = get_readings(sid, limit=20)
        
#         result.append({
#             **ship,
#             'quality_remaining': pred['quality_remaining'],
#             'risk_level': pred['risk_level'],
#             'risk_index': pred['risk_index'],
#             'hours_to_spoilage': pred['hours_to_spoilage'],
#             'recommended_action': pred['recommended_action'],
#             'risk_probabilities': pred['risk_probabilities'],
#             'actions': actions,
#             'readings': readings,
#             'features': {
#                 'avg_temp_c': state['avg_temp_c'],
#                 'humidity_percent': state['humidity_percent'],
#                 'temp_deviation_degree_hr': state['temp_deviation_degree_hr'],
#                 'cumulative_damage_index': state['cumulative_damage_index'],
#                 'transport_duration_hr': state['transport_duration_hr'],
#                 'nh3_ppm': state['nh3_ppm'],
#             },
#         })
    
#     ranked = prioritize_shipments([{
#         'id': r['id'], 'name': r['name'], 'risk_index': r['risk_index'],
#         'quality_remaining': r['quality_remaining'], 'hours_to_spoilage': r['hours_to_spoilage'],
#         'distance_km': r['distance_km'],
#     } for r in result])
    
#     rank_map = {r['id']: i + 1 for i, r in enumerate(ranked)}
#     for r in result:
#         r['priority_rank'] = rank_map[r['id']]
    
#     return result

# @app.get("/api/shipment/{sid}/history")
# async def get_history(sid: str):
#     return get_readings(sid, limit=100)

# @app.post("/api/simulate/spike/{sid}")
# async def simulate_spike(sid: str):
#     if sid in sim_state:
#         sim_state[sid]['avg_temp_c'] += 7.0
#         sim_state[sid]['max_temp_c'] += 8.0
#         sim_state[sid]['temp_deviation_degree_hr'] += 30.0
#         sim_state[sid]['cumulative_damage_index'] += 1.5
#         sim_state[sid]['nh3_ppm'] += 3.0
#         return {'status': 'spike injected', 'shipment': sid}
#     return {'status': 'error', 'message': 'Shipment not found'}

# @app.get("/api/status")
# async def status():
#     return {
#         'status': 'running',
#         'timestamp': datetime.now().isoformat(),
#         'shipments': len(DEMO_SHIPMENTS),
#         'models': 'loaded',
#     }

# # ══════════════════════════════════════════════════════════════
# # ML PREDICTION ENDPOINTS (FIXED)
# # ══════════════════════════════════════════════════════════════

# @app.post("/api/predict")
# async def get_prediction_endpoint(request: PredictionRequest):
#     """General ML Prediction endpoint"""
#     try:
#         # FIX: Use model_dump() instead of dict()
#         data = request.model_dump()
#         prediction = predict(data)
        
#         return {
#             'success': True,
#             'prediction': prediction,
#             'timestamp': datetime.now().isoformat()
#         }
#     except Exception as e:
#         print(f"[ERROR] Prediction failed: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/shipments/{shipment_id}/predict")
# async def predict_shipment_endpoint(shipment_id: str):
#     """Get ML prediction for a specific shipment"""
#     try:
#         if shipment_id not in sim_state:
#             raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
        
#         state = sim_state[shipment_id]
#         prediction = predict(state)
#         shipment = next((s for s in DEMO_SHIPMENTS if s['id'] == shipment_id), None)
        
#         return {
#             'success': True,
#             'shipment_id': shipment_id,
#             'shipment_info': shipment,
#             'prediction': prediction,
#             'current_state': {
#                 'avg_temp_c': state['avg_temp_c'],
#                 'humidity_percent': state['humidity_percent'],
#                 'transport_duration_hr': state['transport_duration_hr'],
#             },
#             'timestamp': datetime.now().isoformat()
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"[ERROR] Shipment prediction failed: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/shipments/{shipment_id}/monitor")
# async def monitor_shipment_endpoint(shipment_id: str, sensor_data: SensorUpdateRequest):
#     """Update sensor data and get real-time prediction"""
#     try:
#         if shipment_id not in sim_state:
#             raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
        
#         # Update state
#         sim_state[shipment_id]['avg_temp_c'] = sensor_data.temperature
#         sim_state[shipment_id]['humidity_percent'] = sensor_data.humidity
#         sim_state[shipment_id]['ethylene_ppm'] = sensor_data.ethylene
#         sim_state[shipment_id]['co2_ppm'] = sensor_data.co2
#         sim_state[shipment_id]['nh3_ppm'] = sensor_data.nh3
#         sim_state[shipment_id]['h2s_ppm'] = sensor_data.h2s
        
#         insert_reading(shipment_id, sensor_data.temperature, sensor_data.humidity)
        
#         prediction = predict(sim_state[shipment_id])
#         alert_triggered = prediction['risk_index'] >= 2
        
#         if alert_triggered:
#             print(f"⚠️  ALERT for {shipment_id}: {prediction['recommended_action']}")
        
#         # FIX: Use model_dump() instead of dict()
#         return {
#             'success': True,
#             'shipment_id': shipment_id,
#             'prediction': prediction,
#             'alert_triggered': alert_triggered,
#             'sensor_data': sensor_data.model_dump(),
#             'timestamp': datetime.now().isoformat()
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         print(f"[ERROR] Monitor update failed: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/health")
# async def health_check_endpoint():
#     """Health check endpoint"""
#     try:
#         test_data = {
#             'avg_temp_c': 5.0,
#             'humidity_percent': 70.0,
#             'transport_duration_hr': 1.0,
#             'product_type': 'milk'
#         }
#         predict(test_data)
        
#         return {
#             'status': 'healthy',
#             'ml_models': 'loaded',
#             'shipments_count': len(DEMO_SHIPMENTS),
#             'timestamp': datetime.now().isoformat()
#         }
#     except Exception as e:
#         print(f"[ERROR] Health check failed: {e}")
#         import traceback
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))

# # ══════════════════════════════════════════════════════════════
# # ROUTE OPTIMIZATION ENDPOINTS
# # ══════════════════════════════════════════════════════════════

# @app.post("/api/route/optimize")
# async def optimize_route(request: RouteRequest):
#     """Calculate optimized route"""
#     distance_km = request.distance_km or 500
#     speed_map = {'reefer_truck': 65, 'insulated_van': 55, 'open_truck': 70}
#     speed = speed_map.get(request.vehicle_type, 60)
#     estimated_hours = round(distance_km / speed, 1)
    
#     fuel_consumption_per_km = {'reefer_truck': 0.35, 'insulated_van': 0.28, 'open_truck': 0.40}.get(request.vehicle_type, 0.35)
#     fuel_liters = round(distance_km * fuel_consumption_per_km, 2)
#     co2_kg = round(fuel_liters * 2.68, 2)
    
#     return {
#         "status": "success",
#         "data": {
#             "origin": request.origin,
#             "destination": request.destination,
#             "distance_km": distance_km,
#             "estimated_hours": estimated_hours,
#             "vehicle_type": request.vehicle_type,
#             "fuel_liters": fuel_liters,
#             "co2_emission_kg": co2_kg,
#         }
#     }

# @app.post("/api/v1/map/emission")
# async def calculate_emission(request: EmissionRequest):
#     """Calculate CO2 emissions"""
#     emission_factors = {'reefer_truck': 0.95, 'insulated_van': 0.75, 'open_truck': 1.05}
#     emission_factor = emission_factors.get(request.vehicle_type, 0.85)
#     total_emission = round(request.distance_km * emission_factor, 2)
    
#     return {
#         "status": "success",
#         "data": {
#             "emission": total_emission,
#             "distance_km": request.distance_km,
#             "vehicle_type": request.vehicle_type,
#             "emission_factor": emission_factor
#         }
#     }

# @app.get("/api/v1/map/emission")
# async def get_emission_info():
#     return {"status": "success", "data": {"emission": 0, "route": [], "message": "Use POST method"}}

# @app.get("/api/route/cities")
# async def get_cities():
#     cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
#               'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore']
#     return {"status": "success", "data": cities}

# @app.post("/api/route/priority")
# async def get_priority_routes(shipment_ids: list):
#     all_shipments = []
#     for ship in DEMO_SHIPMENTS:
#         if ship['id'] not in shipment_ids:
#             continue
#         state = sim_state.get(ship['id'], {})
#         pred = predict(state)
#         all_shipments.append({
#             "id": ship['id'], "name": ship['name'], "origin": ship['origin'],
#             "destination": ship['destination'], "distance_km": ship['distance_km'],
#             "risk_index": pred['risk_index'], "hours_to_spoilage": pred['hours_to_spoilage'],
#             "quality_remaining": pred['quality_remaining']
#         })
    
#     sorted_shipments = sorted(all_shipments, key=lambda x: (x['risk_index'], -x['hours_to_spoilage']), reverse=True)
    
#     return {
#         "status": "success",
#         "data": {
#             "priority_sequence": sorted_shipments,
#             "total_distance": sum(s['distance_km'] for s in sorted_shipments),
#             "critical_count": sum(1 for s in sorted_shipments if s['risk_index'] >= 3)
#         }
#     }

# # ══════════════════════════════════════════════════════════════
# # START SERVER
# # ══════════════════════════════════════════════════════════════

# if __name__ == '__main__':
#     print("=" * 55)
#     print("  IntelliCold Backend Starting...")
#     print("=" * 55)
#     init_db()
#     print("  ✅ Database initialised")
#     print("  ✅ ML models loaded")
#     print("  ✅ API running at http://localhost:5000")
#     print("=" * 55)
    
#     uvicorn.run(app, host="0.0.0.0", port=5000)

"""
IntelliCold — Complete FastAPI Backend
Run: python app.py
API runs on http://localhost:5000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3, os, sys, random, csv
from datetime import datetime
import uvicorn
from typing import Optional
from pydantic import BaseModel

# ── Import ML modules ──
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml_model'))
from ml_model.predict import predict
from ml_model.decision_engine import get_actions, prioritize_shipments

app = FastAPI(title="IntelliCold API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), 'sensor_data.db')
TEST_LOG_PATH = os.path.join(os.path.dirname(__file__), 'banana_test_proof.csv')

# ── CSV Proof Logger ──────────────────────────────────────────
TEST_CSV_HEADERS = [
    'timestamp', 'shipment_id',
    'temperature_c', 'humidity_pct', 'co2_ppm', 'nh3_ppm', 'h2s_ppm', 'ethylene_ppm',
    'risk_index', 'risk_level', 'quality_remaining_pct', 'hours_to_spoilage',
    'recommended_action', 'cooling_pwm', 'cooling_mode'
]

def log_test_proof(sid, temp, hum, co2, nh3, h2s, eth, prediction, pwm_value, mode):
    """Append one row to the banana test proof CSV."""
    file_exists = os.path.isfile(TEST_LOG_PATH)
    with open(TEST_LOG_PATH, 'a', newline='') as f:
        w = csv.writer(f)
        if not file_exists:
            w.writerow(TEST_CSV_HEADERS)
        w.writerow([
            datetime.now().isoformat(),
            sid, temp, hum, co2, nh3, h2s, eth,
            prediction['risk_index'],
            prediction['risk_level'],
            prediction['quality_remaining'],
            prediction['hours_to_spoilage'],
            prediction.get('recommended_action', ''),
            pwm_value, mode
        ])

# ══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ══════════════════════════════════════════════════════════════

class PredictionRequest(BaseModel):
    avg_temp_c: float
    humidity_percent: float
    transport_duration_hr: float
    product_type: str
    ethylene_ppm: Optional[float] = 5.0
    co2_ppm: Optional[float] = 500.0
    nh3_ppm: Optional[float] = 2.0
    h2s_ppm: Optional[float] = 0.2

class SensorUpdateRequest(BaseModel):
    temperature: float
    humidity: float
    ethylene: Optional[float] = 5.0
    co2: Optional[float] = 500.0
    nh3: Optional[float] = 2.0
    h2s: Optional[float] = 0.2

class RouteRequest(BaseModel):
    origin: str
    destination: str
    shipment_id: Optional[str] = None
    vehicle_type: Optional[str] = "reefer_truck"
    distance_km: Optional[float] = 0

class EmissionRequest(BaseModel):
    distance_km: float
    vehicle_type: str = "reefer_truck"

class NewShipmentRequest(BaseModel):
    id: str
    name: str
    origin: str
    destination: str
    distance_km: float
    product_type: str
    vehicle_type: str
    qty_kg: float
    value_per_kg: float
    features: dict

# ══════════════════════════════════════════════════════════════
# DATABASE FUNCTIONS
# ══════════════════════════════════════════════════════════════

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            shipment_id TEXT NOT NULL,
            timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
            temperature REAL,
            humidity    REAL,
            co2_ppm     REAL DEFAULT 0,
            nh3_ppm     REAL DEFAULT 0,
            h2s_ppm     REAL DEFAULT 0,
            ethylene_ppm REAL DEFAULT 0
        )
    ''')
    # Migrate existing DBs that may lack the gas columns
    existing_cols = [row[1] for row in c.execute("PRAGMA table_info(sensor_readings)").fetchall()]
    for col, default in [('co2_ppm', 0), ('nh3_ppm', 0), ('h2s_ppm', 0), ('ethylene_ppm', 0)]:
        if col not in existing_cols:
            c.execute(f'ALTER TABLE sensor_readings ADD COLUMN {col} REAL DEFAULT {default}')
    c.execute('''
        CREATE TABLE IF NOT EXISTS shipments (
            id TEXT PRIMARY KEY,
            name TEXT,
            origin TEXT,
            destination TEXT,
            distance_km REAL,
            product_type TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def insert_reading(shipment_id, temperature, humidity,
                   co2_ppm=0.0, nh3_ppm=0.0, h2s_ppm=0.0, ethylene_ppm=0.0):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        '''INSERT INTO sensor_readings
           (shipment_id, temperature, humidity, co2_ppm, nh3_ppm, h2s_ppm, ethylene_ppm)
           VALUES (?,?,?,?,?,?,?)''',
        (shipment_id, temperature, humidity, co2_ppm, nh3_ppm, h2s_ppm, ethylene_ppm)
    )
    conn.commit()
    conn.close()

def get_readings(shipment_id, limit=50):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        '''SELECT timestamp, temperature, humidity, co2_ppm, nh3_ppm, h2s_ppm, ethylene_ppm
           FROM sensor_readings
           WHERE shipment_id=?
           ORDER BY timestamp DESC LIMIT ?''',
        (shipment_id, limit)
    ).fetchall()
    conn.close()
    return [{
        'timestamp':    r[0],
        'temperature':  r[1],
        'humidity':     r[2],
        'co2_ppm':      r[3] or 0,
        'nh3_ppm':      r[4] or 0,
        'h2s_ppm':      r[5] or 0,
        'ethylene_ppm': r[6] or 0,
    } for r in rows]

# ══════════════════════════════════════════════════════════════
# DEMO DATA
# ══════════════════════════════════════════════════════════════

DEMO_SHIPMENTS = [
    {'id': 'S001', 'name': 'Vaccine Batch A', 'origin': 'Mumbai', 'destination': 'Delhi',
     'distance_km': 1400, 'product_type': 'vaccines', 'vehicle_type': 'reefer_truck'},
    {'id': 'S002', 'name': 'Dairy Cargo B', 'origin': 'Pune', 'destination': 'Nashik',
     'distance_km': 210, 'product_type': 'milk', 'vehicle_type': 'insulated_van'},
    {'id': 'S003', 'name': 'Meat Shipment C', 'origin': 'Surat', 'destination': 'Chennai',
     'distance_km': 1460, 'product_type': 'meat', 'vehicle_type': 'reefer_truck'},
]

sim_state = {
    'S001': {'avg_temp_c': 3.5, 'humidity_percent': 60, 'transport_duration_hr': 4,
             'product_type': 'vaccines', 'ethylene_ppm': 0.5, 'co2_ppm': 400,
             'nh3_ppm': 1.0, 'h2s_ppm': 0.05},
    'S002': {'avg_temp_c': 7.0, 'humidity_percent': 78, 'transport_duration_hr': 18,
             'product_type': 'milk', 'ethylene_ppm': 5.0, 'co2_ppm': 550,
             'nh3_ppm': 4.0, 'h2s_ppm': 0.4},
    'S003': {'avg_temp_c': 10.5, 'humidity_percent': 85, 'transport_duration_hr': 36,
             'product_type': 'meat', 'ethylene_ppm': 0.0, 'co2_ppm': 700,
             'nh3_ppm': 8.0, 'h2s_ppm': 1.2},
}

# ─── Tracks when REAL sensor data was last received (per shipment) ────────
sensor_last_update = {}   # sid -> datetime of last ESP32 POST
SENSOR_FRESHNESS_SECS = 120  # How long to trust real data before simulation resumes

DEFAULT_SIM_STATE = {
    'avg_temp_c': 5.0, 'humidity_percent': 65.0, 'transport_duration_hr': 0.0,
    'product_type': 'milk', 'ethylene_ppm': 2.0, 'co2_ppm': 420.0,
    'nh3_ppm': 1.5, 'h2s_ppm': 0.1,
}

def evolve_state(sid):
    """Simulate sensor drift — but SKIP if real sensor data is fresh"""
    # Auto-initialize new shipments so they don't blow up with KeyError
    if sid not in sim_state:
        sim_state[sid] = dict(DEFAULT_SIM_STATE)
    s = sim_state[sid]
    last = sensor_last_update.get(sid)
    if last and (datetime.now() - last).total_seconds() < SENSOR_FRESHNESS_SECS:
        # Real data is fresh — just tick transport time, don't overwrite sensor values
        s['transport_duration_hr'] = round(s['transport_duration_hr'] + 0.083, 2)
        return s
    # Simulation drift (no real hardware connected)
    s['avg_temp_c'] = round(s['avg_temp_c'] + random.uniform(-0.1, 0.25), 2)
    s['humidity_percent'] = round(min(99, max(40, s['humidity_percent'] + random.uniform(-0.5, 0.5))), 1)
    s['transport_duration_hr'] = round(s['transport_duration_hr'] + 0.083, 2)
    s['nh3_ppm'] = round(max(0, s['nh3_ppm'] + random.uniform(-0.05, 0.1)), 2)
    return s

# ══════════════════════════════════════════════════════════════
# ML PREDICTION ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/api/predict")
async def get_prediction_endpoint(request: PredictionRequest):
    """General ML Prediction endpoint"""
    try:
        data = request.model_dump()
        prediction = predict(data)
        
        return {
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/shipments/{shipment_id}/predict")
async def predict_shipment_endpoint(shipment_id: str):
    """Get ML prediction for specific shipment"""
    try:
        if shipment_id not in sim_state:
            raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
        
        state = sim_state[shipment_id]
        prediction = predict(state)
        shipment = next((s for s in DEMO_SHIPMENTS if s['id'] == shipment_id), None)
        
        return {
            'success': True,
            'shipment_id': shipment_id,
            'shipment_info': shipment,
            'prediction': prediction,
            'current_state': state,
            'timestamp': datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Shipment prediction failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/shipments/{shipment_id}/monitor")
async def monitor_shipment_endpoint(shipment_id: str, sensor_data: SensorUpdateRequest):
    """Update sensor data and get real-time prediction"""
    try:
        if shipment_id not in sim_state:
            raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
        
        # Update state
        sim_state[shipment_id]['avg_temp_c'] = sensor_data.temperature
        sim_state[shipment_id]['humidity_percent'] = sensor_data.humidity
        sim_state[shipment_id]['ethylene_ppm'] = sensor_data.ethylene
        sim_state[shipment_id]['co2_ppm'] = sensor_data.co2
        sim_state[shipment_id]['nh3_ppm'] = sensor_data.nh3
        sim_state[shipment_id]['h2s_ppm'] = sensor_data.h2s
        
        insert_reading(shipment_id, sensor_data.temperature, sensor_data.humidity)
        
        prediction = predict(sim_state[shipment_id])
        alert_triggered = prediction['risk_index'] >= 2
        
        if alert_triggered:
            print(f"⚠️  ALERT for {shipment_id}: {prediction['recommended_action']}")
        
        return {
            'success': True,
            'shipment_id': shipment_id,
            'prediction': prediction,
            'alert_triggered': alert_triggered,
            'sensor_data': sensor_data.model_dump(),
            'timestamp': datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Monitor update failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def get_all_readings(shipment_id, limit=500):
    """Return all stored readings for a shipment, newest first."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        '''SELECT timestamp, temperature, humidity, co2_ppm, nh3_ppm, h2s_ppm, ethylene_ppm
           FROM sensor_readings
           WHERE shipment_id=?
           ORDER BY timestamp DESC LIMIT ?''',
        (shipment_id, limit)
    ).fetchall()
    conn.close()
    return [{
        'timestamp':    r[0],
        'temperature':  r[1],
        'humidity':     r[2],
        'co2_ppm':      r[3] or 0,
        'nh3_ppm':      r[4] or 0,
        'h2s_ppm':      r[5] or 0,
        'ethylene_ppm': r[6] or 0,
    } for r in rows]

@app.get("/api/history/{shipment_id}")
async def get_history_endpoint(shipment_id: str, limit: int = 200):
    """Return full stored sensor history for a shipment."""
    readings = get_all_readings(shipment_id, limit=limit)
    return {"shipment_id": shipment_id, "count": len(readings), "readings": readings}

@app.get("/api/health")
async def health_check_endpoint():
    """Health check endpoint"""
    try:
        test_data = {
            'avg_temp_c': 5.0,
            'humidity_percent': 70.0,
            'transport_duration_hr': 1.0,
            'product_type': 'milk'
        }
        predict(test_data)
        
        return {
            'status': 'healthy',
            'ml_models': 'loaded',
            'shipments_count': len(DEMO_SHIPMENTS),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[ERROR] Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ══════════════════════════════════════════════════════════════
# SHIPMENT MANAGEMENT ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/api/sensor")
async def receive_sensor(data: dict):
    """
    Endpoint called by ESP32 every 30 seconds.
    Stores real sensor values, runs ML prediction,
    and returns prediction + cooling command to the ESP32.
    """
    sid = data.get('shipment_id', 'S001')
    temp = float(data.get('temperature', 5.0))
    hum  = float(data.get('humidity', 60.0))
    co2  = float(data.get('co2', 500.0))
    nh3  = float(data.get('nh3', 2.0))
    h2s  = float(data.get('h2s', 0.2))
    eth  = float(data.get('ethylene', 5.0))

    # 1. Store ALL sensor fields in SQLite
    insert_reading(sid, temp, hum, co2, nh3, h2s, eth)

    # 2. Update sim_state with ALL real sensor fields
    if sid in sim_state:
        sim_state[sid]['avg_temp_c']       = temp
        sim_state[sid]['humidity_percent'] = hum
        sim_state[sid]['co2_ppm']          = co2
        sim_state[sid]['nh3_ppm']          = nh3
        sim_state[sid]['h2s_ppm']          = h2s
        sim_state[sid]['ethylene_ppm']     = eth

    # 3. Mark fresh real-data timestamp (prevents evolve_state from overwriting)
    sensor_last_update[sid] = datetime.now()
    print(f"[ESP32] {sid}: T={temp}°C  H={hum}%  CO2={co2}ppm  NH3={nh3}ppm")

    # 4. Run ML prediction on the real sensor values
    try:
        state = sim_state.get(sid, {})
        prediction = predict(state)
        alert = prediction['risk_index'] >= 2
        if alert:
            print(f"⚠️  ALERT {sid}: {prediction['recommended_action']}")

        # 5. Compute cooling PWM command for Peltier
        pwm_map = {0: 51, 1: 128, 2: 204, 3: 255}
        pwm_value = pwm_map.get(prediction['risk_index'], 51)
        if prediction['quality_remaining'] < 30:
            pwm_value = max(pwm_value, 204)
        if temp > 15:
            pwm_value = max(pwm_value, 153)  # pre-cool at 60%

        mode_map = {51: 'MAINTAIN', 128: 'MODERATE', 204: 'STRONG', 255: 'CRITICAL'}
        mode = mode_map.get(pwm_value, 'MAINTAIN')

        # 6. Log to CSV proof file for banana cold-chain test
        log_test_proof(sid, temp, hum, co2, nh3, h2s, eth, prediction, pwm_value, mode)

        return {
            'status': 'ok',
            'shipment_id': sid,
            'prediction': {
                'risk_index':        prediction['risk_index'],
                'risk_level':        prediction['risk_level'],
                'quality_remaining': prediction['quality_remaining'],
                'hours_to_spoilage': prediction['hours_to_spoilage'],
                'recommended_action': prediction.get('recommended_action', ''),
            },
            'cooling_action': {
                'pwm_value': pwm_value,
                'mode':      mode,
                'reason':    f"risk={prediction['risk_level']}, quality={prediction['quality_remaining']:.1f}%"
            },
            'alert_triggered': alert,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        print(f"[ERROR] ML prediction in /api/sensor failed: {e}")
        return {'status': 'ok', 'message': 'Saved but ML failed', 'error': str(e)}


@app.post("/api/shipments")
async def create_shipment_endpoint(req: NewShipmentRequest):
    """Add a new shipment to DEMO_SHIPMENTS"""
    new_ship = {
        'id': req.id,
        'name': req.name,
        'origin': req.origin,
        'destination': req.destination,
        'distance_km': req.distance_km,
        'product_type': req.product_type,
        'vehicle_type': req.vehicle_type,
        'qty_kg': req.qty_kg,
        'value_per_kg': req.value_per_kg
    }
    if not any(s['id'] == req.id for s in DEMO_SHIPMENTS):
        DEMO_SHIPMENTS.append(new_ship)
        insert_reading(req.id, req.features.get('avg_temp_c', 5.0), req.features.get('humidity_percent', 60.0))
    
    sim_state[req.id] = req.features
    return {"status": "success"}

@app.get("/api/shipments")
async def get_shipments_endpoint():
    """Get all shipments with predictions"""
    result = []
    for i, ship in enumerate(DEMO_SHIPMENTS):
        sid = ship['id']
        try:
            state = evolve_state(sid)
            pred = predict(state)
            actions = get_actions(pred, ship.get('distance_km', 500))
            readings = get_readings(sid, limit=50)

            result.append({
                **ship,
                'priority_rank': i + 1,
                'quality_remaining': pred['quality_remaining'],
                'risk_level': pred['risk_level'],
                'risk_index': pred['risk_index'],
                'hours_to_spoilage': pred['hours_to_spoilage'],
                'recommended_action': pred['recommended_action'],
                'risk_probabilities': pred.get('risk_probabilities', {}),
                'actions': actions,
                'readings': readings,
                'current_state': state,
                'features': {
                    'avg_temp_c':               state.get('avg_temp_c', 5.0),
                    'humidity_percent':          state.get('humidity_percent', 60.0),
                    'nh3_ppm':                   state.get('nh3_ppm', 2.0),
                    'co2_ppm':                   state.get('co2_ppm', 400.0),
                    'h2s_ppm':                   state.get('h2s_ppm', 0.2),
                    'ethylene_ppm':              state.get('ethylene_ppm', 5.0),
                    'transport_duration_hr':     state.get('transport_duration_hr', 0.0),
                    'temp_deviation_degree_hr':  round(
                        max(0.0, state.get('avg_temp_c', 5.0) - 4.0) * state.get('transport_duration_hr', 1.0) / 10.0, 1
                    ),
                    'cumulative_damage_index':   round(
                        max(0.0, (state.get('avg_temp_c', 5.0) - 4.0) * 0.005 + state.get('nh3_ppm', 2.0) * 0.01), 3
                    ),
                },
                'is_live': sensor_last_update.get(sid) is not None and
                           (datetime.now() - sensor_last_update[sid]).total_seconds() < SENSOR_FRESHNESS_SECS,
            })
        except Exception as e:
            print(f"[WARN] Skipping shipment {sid} due to error: {e}")

    ranked = prioritize_shipments([{
        'id': r['id'], 'name': r['name'], 'risk_index': r['risk_index'],
        'quality_remaining': r['quality_remaining'], 'hours_to_spoilage': r['hours_to_spoilage'],
        'distance_km': r['distance_km'],
    } for r in result])

    rank_map = {r['id']: i + 1 for i, r in enumerate(ranked)}
    for r in result:
        r['priority_rank'] = rank_map[r['id']]

    return result


@app.get("/api/shipment/{sid}/history")
async def get_history(sid: str):
    return get_readings(sid, limit=100)


@app.post("/api/simulate/spike/{sid}")
async def simulate_spike(sid: str):
    """Simulate temperature spike for testing"""
    if sid in sim_state:
        sim_state[sid]['avg_temp_c'] += 7.0
        sim_state[sid]['nh3_ppm'] += 3.0
        return {'status': 'spike injected', 'shipment': sid}
    return {'status': 'error', 'message': 'Shipment not found'}


@app.get("/api/status")
async def status():
    return {
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'shipments': len(DEMO_SHIPMENTS),
        'models': 'loaded',
    }

# ══════════════════════════════════════════════════════════════
# ROUTE OPTIMIZATION ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/api/route/optimize")
async def optimize_route(request: RouteRequest):
    """Calculate optimized route"""
    distance_km = request.distance_km or 500
    speed_map = {'reefer_truck': 65, 'insulated_van': 55, 'open_truck': 70}
    speed = speed_map.get(request.vehicle_type, 60)
    estimated_hours = round(distance_km / speed, 1)
    
    fuel_consumption_per_km = {'reefer_truck': 0.35, 'insulated_van': 0.28, 'open_truck': 0.40}.get(request.vehicle_type, 0.35)
    fuel_liters = round(distance_km * fuel_consumption_per_km, 2)
    co2_kg = round(fuel_liters * 2.68, 2)
    
    return {
        "status": "success",
        "data": {
            "origin": request.origin,
            "destination": request.destination,
            "distance_km": distance_km,
            "estimated_hours": estimated_hours,
            "vehicle_type": request.vehicle_type,
            "fuel_liters": fuel_liters,
            "co2_emission_kg": co2_kg,
        }
    }


@app.post("/api/v1/map/emission")
async def calculate_emission(request: EmissionRequest):
    """Calculate CO2 emissions"""
    emission_factors = {'reefer_truck': 0.95, 'insulated_van': 0.75, 'open_truck': 1.05}
    emission_factor = emission_factors.get(request.vehicle_type, 0.85)
    total_emission = round(request.distance_km * emission_factor, 2)
    
    return {
        "status": "success",
        "data": {
            "emission": total_emission,
            "distance_km": request.distance_km,
            "vehicle_type": request.vehicle_type,
            "emission_factor": emission_factor
        }
    }


@app.get("/api/v1/map/emission")
async def get_emission_info():
    return {"status": "success", "data": {"emission": 0, "route": [], "message": "Use POST method"}}


@app.get("/api/route/cities")
async def get_cities():
    cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
              'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore']
    return {"status": "success", "data": cities}


@app.post("/api/route/priority")
async def get_priority_routes(shipment_ids: list):
    """Get optimized delivery sequence"""
    all_shipments = []
    for ship in DEMO_SHIPMENTS:
        if ship['id'] not in shipment_ids:
            continue
        state = sim_state.get(ship['id'], {})
        pred = predict(state)
        all_shipments.append({
            "id": ship['id'], "name": ship['name'], "origin": ship['origin'],
            "destination": ship['destination'], "distance_km": ship['distance_km'],
            "risk_index": pred['risk_index'], "hours_to_spoilage": pred['hours_to_spoilage'],
            "quality_remaining": pred['quality_remaining']
        })
    
    sorted_shipments = sorted(all_shipments, key=lambda x: (x['risk_index'], -x['hours_to_spoilage']), reverse=True)
    
    return {
        "status": "success",
        "data": {
            "priority_sequence": sorted_shipments,
            "total_distance": sum(s['distance_km'] for s in sorted_shipments),
            "critical_count": sum(1 for s in sorted_shipments if s['risk_index'] >= 3)
        }
    }

# ══════════════════════════════════════════════════════════════
# START SERVER
# ══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("=" * 55)
    print("  IntelliCold Backend Starting...")
    print("=" * 55)
    init_db()
    print("  ✅ Database initialised")
    print("  ✅ ML models loaded")
    print("  ✅ API running at http://localhost:5000")
    print("=" * 55)
    
    uvicorn.run(app, host="0.0.0.0", port=5000)