"""
IntelliCold — FastAPI Backend
Run: python app.py
API runs on http://localhost:5000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3, os, sys, random
from datetime import datetime
import uvicorn

# ── Import ML modules ──
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml_model'))
from predict import predict
from decision_engine import get_actions, prioritize_shipments

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), 'sensor_data.db')

# ── Database functions (keep same) ──
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shipment_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            temperature REAL,
            humidity REAL
        )
    ''')
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

def insert_reading(shipment_id, temperature, humidity):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        'INSERT INTO sensor_readings (shipment_id, temperature, humidity) VALUES (?,?,?)',
        (shipment_id, temperature, humidity)
    )
    conn.commit()
    conn.close()

def get_readings(shipment_id, limit=50):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        '''SELECT timestamp, temperature, humidity
           FROM sensor_readings
           WHERE shipment_id=?
           ORDER BY timestamp DESC LIMIT ?''',
        (shipment_id, limit)
    ).fetchall()
    conn.close()
    return [{'timestamp': r[0], 'temperature': r[1], 'humidity': r[2]} for r in rows]

# ── Demo data (keep same) ──
DEMO_SHIPMENTS = [
    {'id': 'S001', 'name': 'Vaccine Batch A', 'origin': 'Mumbai', 'destination': 'Delhi',
     'distance_km': 1400, 'product_type': 'vaccine', 'vehicle_type': 'reefer_truck'},
    {'id': 'S002', 'name': 'Dairy Cargo B', 'origin': 'Pune', 'destination': 'Nashik',
     'distance_km': 210, 'product_type': 'milk', 'vehicle_type': 'insulated_van'},
    {'id': 'S003', 'name': 'Pharma Lot C', 'origin': 'Surat', 'destination': 'Chennai',
     'distance_km': 1460, 'product_type': 'meat', 'vehicle_type': 'open_truck'},
]

sim_state = {
    'S001': {'avg_temp_c': 3.5, 'max_temp_c': 5.0, 'origin_temp_c': 2.0,
             'humidity_percent': 60, 'transport_duration_hr': 4, 'distance_km': 1400,
             'vehicle_type': 'reefer_truck', 'product_type': 'vaccine',
             'nh3_ppm': 1.0, 'h2s_ppm': 0.05, 'co2_ppm': 400, 'ethylene_ppm': 0.5,
             'temp_deviation_degree_hr': 2.0, 'cumulative_damage_index': 0.05},
    'S002': {'avg_temp_c': 7.0, 'max_temp_c': 12.0, 'origin_temp_c': 4.0,
             'humidity_percent': 78, 'transport_duration_hr': 18, 'distance_km': 210,
             'vehicle_type': 'insulated_van', 'product_type': 'milk',
             'nh3_ppm': 4.0, 'h2s_ppm': 0.4, 'co2_ppm': 550, 'ethylene_ppm': 5.0,
             'temp_deviation_degree_hr': 25.0, 'cumulative_damage_index': 0.4},
    'S003': {'avg_temp_c': 10.5, 'max_temp_c': 15.0, 'origin_temp_c': 3.0,
             'humidity_percent': 85, 'transport_duration_hr': 36, 'distance_km': 1460,
             'vehicle_type': 'open_truck', 'product_type': 'meat',
             'nh3_ppm': 8.0, 'h2s_ppm': 1.2, 'co2_ppm': 700, 'ethylene_ppm': 0.0,
             'temp_deviation_degree_hr': 90.0, 'cumulative_damage_index': 2.8},
}

def evolve_state(sid):
    s = sim_state[sid]
    s['avg_temp_c'] = round(s['avg_temp_c'] + random.uniform(-0.1, 0.25), 2)
    s['max_temp_c'] = round(max(s['max_temp_c'], s['avg_temp_c'] + random.uniform(0.5, 1.5)), 2)
    s['humidity_percent'] = round(min(99, max(40, s['humidity_percent'] + random.uniform(-0.5, 0.5))), 1)
    s['transport_duration_hr'] = round(s['transport_duration_hr'] + 0.083, 2)
    s['temp_deviation_degree_hr'] = round(s['temp_deviation_degree_hr'] + (0.5 if s['avg_temp_c'] > 4 else 0), 2)
    s['cumulative_damage_index'] = round(s['cumulative_damage_index'] + (0.01 if s['avg_temp_c'] > 4 else 0), 3)
    s['nh3_ppm'] = round(max(0, s['nh3_ppm'] + random.uniform(-0.05, 0.1)), 2)
    return s

# ── API Routes (FastAPI syntax) ──

@app.post("/api/sensor")
async def receive_sensor(data: dict):
    sid = data.get('shipment_id', 'S001')
    temp = float(data['temperature'])
    hum = float(data['humidity'])
    insert_reading(sid, temp, hum)
    if sid in sim_state:
        sim_state[sid]['avg_temp_c'] = temp
        sim_state[sid]['humidity_percent'] = hum
    return {'status': 'ok', 'message': 'Reading saved'}

@app.get("/api/shipments")
async def get_shipments_endpoint():
    result = []
    for ship in DEMO_SHIPMENTS:
        sid = ship['id']
        state = evolve_state(sid)
        pred = predict(state)
        actions = get_actions(pred, ship['distance_km'])
        readings = get_readings(sid, limit=20)
        
        result.append({
            **ship,
            'quality_remaining': pred['quality_remaining'],
            'risk_level': pred['risk_level'],
            'risk_index': pred['risk_index'],
            'hours_to_spoilage': pred['hours_to_spoilage'],
            'recommended_action': pred['recommended_action'],
            'risk_probabilities': pred['risk_probabilities'],
            'actions': actions,
            'readings': readings,
            'features': {
                'avg_temp_c': state['avg_temp_c'],
                'humidity_percent': state['humidity_percent'],
                'temp_deviation_degree_hr': state['temp_deviation_degree_hr'],
                'cumulative_damage_index': state['cumulative_damage_index'],
                'transport_duration_hr': state['transport_duration_hr'],
                'nh3_ppm': state['nh3_ppm'],
            },
        })
    
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
    if sid in sim_state:
        sim_state[sid]['avg_temp_c'] += 7.0
        sim_state[sid]['max_temp_c'] += 8.0
        sim_state[sid]['temp_deviation_degree_hr'] += 30.0
        sim_state[sid]['cumulative_damage_index'] += 1.5
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

@app.get("/api/v1/map/emission")
async def get_emissions():
    return {"status": "success", "data": {"emission": 0, "route": []}}

# ── START SERVER ──
if __name__ == '__main__':
    print("=" * 55)
    print("  IntelliCold Backend Starting...")
    print("=" * 55)
    init_db()
    print("  ✅ Database initialised")
    print("  ✅ ML models loaded")
    print("  ✅ API running at http://localhost:5000")
    print("=" * 55)
    
    # Use uvicorn to run FastAPI
    uvicorn.run(app, host="0.0.0.0", port=5000)