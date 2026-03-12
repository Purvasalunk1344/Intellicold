import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PRODUCT_CONFIG, VEHICLE_CONFIG, CITY_GRAPH } from '../data/constants';
import './RouteOptimizer.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const OBJECTIVES = [
  { value: 'balanced', label: 'Balanced (Risk + Time)' },
  { value: 'fastest', label: 'Fastest Delivery' },
  { value: 'safest', label: 'Safest Route (Min Exposure)' },
  { value: 'economic', label: 'Most Economic' },
];

const COLD_CHAIN_HUBS = {
  "Tawang": [27.586, 91.859], "Guwahati": [26.115, 91.708], "Begusarai": [25.418, 86.127], "Vaishali": [25.819, 85.201], "Muzaffarpur": [26.119, 85.390],
  "Raipur": [21.251, 81.629], "Bhavnagar": [21.764, 72.151], "Panchmhal": [22.753, 73.616], "Kheda": [22.750, 72.683],
  "Rewari": [28.192, 76.619], "Hissar": [29.149, 75.711], "Mewat": [27.994, 76.953],
  "Una": [31.468, 76.270], "Kullu": [31.957, 77.109],
  "Baramula": [34.198, 74.363], "Pulwama": [33.882, 74.899], "Sopore": [34.298, 74.471], "Jammu": [32.726, 74.857], "Srinagar": [34.083, 74.797],
  "Hassan": [13.006, 76.100], "Kolar": [13.136, 78.129], "Bijapur": [16.827, 75.724], "Ramnagara": [12.720, 77.281], "Uttar Kannada": [14.881, 74.740], "Udipi": [13.340, 74.742],
  "Pattanamthitta": [9.264, 76.786], "Palakkad": [10.786, 76.654], "Alappuzha": [9.498, 76.338],
  "Betul": [21.902, 77.902], "Jhabua": [22.766, 74.593], "Dhar": [22.593, 75.304], "Raisen": [23.333, 77.783], "Malanpur": [26.311, 78.272],
  "Sangli": [16.852, 74.581], "Ahmednagar": [19.095, 74.738], "Satara": [17.680, 73.989], "Navi Mumbai": [19.033, 73.029], "Srirampur": [19.613, 74.654], "Latur": [18.408, 76.560], "Osmanabad": [18.274, 76.046], "Chandrapur": [19.961, 79.296], "Thane": [19.218, 72.978], "Beed": [18.989, 75.760], "Bhiwandi": [19.281, 73.048], "Amravati": [20.932, 77.752],
  "Senapati": [25.274, 94.020], "Aizawal": [23.730, 92.717], "Dimapur": [25.858, 93.727], "Cuttak": [20.462, 85.882], "Balasore": [21.493, 86.933],
  "Ropar": [30.966, 76.533], "Sangrur": [30.245, 75.845], "Fatehgarh Sahib": [30.640, 76.395], "Patiala": [30.339, 76.386], "Mohali": [30.704, 76.717],
  "Alwar": [27.552, 76.634], "Bundi": [25.430, 75.639], "Dholpur": [26.702, 77.893],
  "Theni": [10.010, 77.476], "Metttupalayam": [11.309, 76.940], "Madurai": [9.925, 78.119], "Hosur": [12.740, 77.825], "Trichy": [10.790, 78.704], "Tuticorin": [8.764, 78.134], "Salem": [11.664, 78.146], "Tirunilveli": [8.714, 77.756], "Kanchipuram": [12.836, 79.703], "Palacode": [12.304, 78.069], "Thiruvallur": [13.136, 79.914],
  "Rangareddy": [17.340, 78.156], "Medak": [18.046, 78.261],
  "Unnao": [26.540, 80.488], "Gautam Buddh Nagar": [28.367, 77.546], "Panchsheel Nagar": [28.730, 77.775], "Shahjahanpur": [27.880, 79.912], "Auraiya": [26.467, 79.513], "Pilibhit": [28.627, 79.799], "Badaun": [28.028, 79.123], "Allahabad": [25.435, 81.846], "Mathura": [27.492, 77.673], "Ballia": [25.758, 84.144], "Amroha": [28.904, 78.467], "Rai Bareli": [26.230, 81.240], "Etawah": [26.772, 79.020], "Jalaun": [26.140, 79.351],
  "Nainital": [29.391, 79.453], "Paschim Medinipur": [22.423, 87.324], "Howrah": [22.595, 88.263], "South 24 Paragnas": [22.155, 88.423], "North 24 Paragnas": [22.616, 88.402],
  "Guntur": [16.306, 80.436], "East Godavari": [17.322, 81.776],
  "Nellore": [14.442, 79.987], "Prakasham": [15.337, 79.742],
  "Surat": [21.170, 72.831], "Mehsana": [23.600, 72.369],
  "Vadodara": [22.307, 73.181], "Ahmedabad": [23.022, 72.571],
  "Banaskantha": [24.174, 72.437], "Sabarkantha": [23.583, 73.017],
  "Nashik": [19.997, 73.789], "Nagpur": [21.146, 79.088],
  "Pune": [18.520, 73.856], "Mumbai": [19.076, 72.877],
  "Raigad": [18.513, 73.183], "Aurangabad": [19.877, 75.340],
  "Solapur": [17.687, 75.901], "Kolhapur": [16.705, 74.243],
  "Sonepat": [28.993, 77.012], "Palwal": [28.143, 77.323],
  "Gurgaon": [28.459, 77.026], "Ludhiana": [30.901, 75.857],
  "Jalandhar": [31.326, 75.576], "Amritsar": [31.634, 74.872],
  "Kapurthala": [31.381, 75.380], "Shimla": [31.104, 77.173],
  "Solan": [30.909, 77.096], "Agra": [27.176, 78.008],
  "Lucknow": [26.847, 80.947], "Kanpur": [26.449, 80.331],
  "Noida": [28.535, 77.391], "Ghaziabad": [28.669, 77.438],
  "Haridwar": [29.945, 78.164], "Udham Singh Nagar": [28.999, 79.515],
  "Kashipur": [29.212, 78.963], "Jaipur": [26.912, 75.787],
  "Kota": [25.185, 75.839], "Bikaner": [28.022, 73.312],
  "Bhopal": [23.259, 77.412], "Indore": [22.719, 75.857],
  "Jabalpur": [23.182, 79.986], "Bangalore": [12.971, 77.594],
  "Belgaum": [15.849, 74.497], "Chennai": [13.083, 80.270],
  "Coimbatore": [11.016, 76.955], "Hyderabad": [17.385, 78.486],
  "Kochi": [9.931, 76.267], "Kozhikode": [11.258, 75.780],
  "Kolkata": [22.572, 88.363], "Hooghly": [22.906, 88.390],
  "Delhi": [28.613, 77.209], "Chandigarh": [30.733, 76.779],
  "Patna": [25.594, 85.137],
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function getDistPointToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return { dist: Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) * 111, t: 0 };
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projectionX = x1 + t * (x2 - x1);
  const projectionY = y1 + t * (y2 - y1);
  const dist = Math.sqrt((px - projectionX) ** 2 + (py - projectionY) ** 2) * 111;
  return { dist, t };
}

function findIntermediates(origin, dest) {
  const originCoord = COLD_CHAIN_HUBS[origin] || [20.5, 78.9];
  const destCoord = COLD_CHAIN_HUBS[dest] || [20.5, 78.9];

  const originY = originCoord[0], originX = originCoord[1];
  const destY = destCoord[0], destX = destCoord[1];

  let candidates = [];

  for (const city in COLD_CHAIN_HUBS) {
    if (city === origin || city === dest) continue;
    const coord = COLD_CHAIN_HUBS[city];
    const py = coord[0], px = coord[1];

    const { dist, t } = getDistPointToSegment(px, py, originX, originY, destX, destY);

    if (t > 0 && t < 1 && dist < 200) {
      candidates.push({ city, dist });
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.slice(0, 2).map(c => c.city);
}

function buildRoutes(ship, objective, vehicle, maxStops) {
  const vCfg = VEHICLE_CONFIG[vehicle] || VEHICLE_CONFIG['reefer_truck'];
  const speed = vCfg.speedKmh;
  const riskMult = vCfg.riskMult;
  const dist = ship.distance_km;
  const baseHrs = dist / speed;
  const mids = findIntermediates(ship.origin, ship.destination);
  const riskBase = ship.risk_index * 25;

  const routes = [
    {
      id: 'express',
      name: 'EXPRESS ROUTE',
      tag: 'FASTEST',
      color: '#00c8f0',
      stops: [
        { name: ship.origin, type: 'origin', detail: 'Immediate departure · No stops · Highway priority' },
        { name: ship.destination, type: 'dest', detail: 'Earliest possible arrival' },
      ],
      dist: Math.round(dist * 0.93),
      hrs: baseHrs * 0.78,
      riskScore: Math.round(riskBase * riskMult * 1.1),
      qualitySaved: Math.round(14 + ship.risk_index * 6),
      costSaving: `+₹${Math.round(dist * 8)} fuel surcharge`,
    },
    {
      id: 'cold_hub',
      name: 'COLD HUB ROUTE',
      tag: 'SAFEST',
      color: '#ffca28',
      stops: [
        { name: ship.origin, type: 'origin', detail: 'Departure with full pre-cooling protocol' },
        ...(mids.slice(0, Math.min(maxStops, 2)).map((m, i) => ({
          name: m, type: 'waypoint',
          detail: i === 0 ? 'Cold storage hub · Re-icing available · Quality inspection'
            : 'Secondary hub · Temperature audit · Driver handover',
        }))),
        { name: ship.destination, type: 'dest', detail: 'Guaranteed quality delivery · Recipient present' },
      ],
      dist: Math.round(dist * 1.14),
      hrs: baseHrs * 1.22,
      riskScore: Math.round(riskBase * riskMult * 0.55),
      qualitySaved: Math.round(20 + ship.risk_index * 7),
      costSaving: `-₹${Math.round((ship.qty_kg || 500) * (ship.value_per_kg || 200) * 0.12)} spoilage prevention`,
    },
  ];

  return routes;
}

function StopNode({ stop, isLast }) {
  return (
    <div className="route-stop">
      <div className="stop-spine">
        <div className={`stop-dot ${stop.type}`} />
        {!isLast && <div className="stop-line" />}
      </div>
      <div className="stop-body">
        <div className="stop-name">{stop.name}</div>
        <div className="stop-detail">{stop.detail}</div>
        {stop.type === 'waypoint' && <span className="rb rb-Medium" style={{ fontSize: 8, marginTop: 4, display: 'inline-block' }}>COLD HUB</span>}
        {stop.type === 'origin' && <span className="rb rb-Low" style={{ fontSize: 8, marginTop: 4, display: 'inline-block' }}>ORIGIN</span>}
        {stop.type === 'dest' && <span className="rb rb-High" style={{ fontSize: 8, marginTop: 4, display: 'inline-block', background: 'rgba(0,200,240,0.1)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>DESTINATION</span>}
      </div>
    </div>
  );
}

export default function RouteOptimizer({ shipments, defaultShipId }) {
  const [shipId, setShipId] = useState(defaultShipId || '');
  const [objective, setObjective] = useState('balanced');
  const [vehicle, setVehicle] = useState('reefer_truck');
  const [maxStops, setMaxStops] = useState(2);
  const [selected, setSelected] = useState(0);
  const [routes, setRoutes] = useState([]);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const ship = shipments.find(s => s.id === shipId);

  useEffect(() => {
    if (defaultShipId) setShipId(defaultShipId);
  }, [defaultShipId]);

  useEffect(() => {
    if (ship) {
      setVehicle(ship.vehicle_type || 'reefer_truck');
      const r = buildRoutes(ship, objective, vehicle, maxStops);

      let defaultIdx = 0;
      const isCritical = ship.risk_level === 'Critical' || ship.hours_to_spoilage < 12;
      const isHigh = !isCritical && (ship.risk_level === 'High' || ship.quality_remaining < 40);
      const isMedium = !isCritical && !isHigh && ship.risk_level === 'Medium';
      const isLow = !isCritical && !isHigh && !isMedium;

      if (isCritical) {
        defaultIdx = 0; // index 0 is EXPRESS
      } else if (isHigh) {
        defaultIdx = 1; // index 1 is COLD HUB
      } else if (isMedium) {
        defaultIdx = 0;
      } else if (isLow) {
        defaultIdx = 1;
      }

      r.forEach(route => {
        if (route.id === 'express' && (isCritical || isMedium)) {
          route.tag = 'RECOMMENDED';
        } else if (route.id === 'cold_hub' && (isHigh || isLow)) {
          route.tag = 'RECOMMENDED';
        }
      });

      setRoutes(r);
      setSelected(defaultIdx);
    }
  }, [ship?.id, objective, vehicle, maxStops]);

  const cfg = ship ? (PRODUCT_CONFIG[ship.product_type] || {}) : {};
  const activeRoute = routes[selected];

  useEffect(() => {
    if (!mapRef.current || !activeRoute) return;

    // Destroy existing map completely before recreating
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      } catch (e) { }
      mapInstanceRef.current = null;
    }

    // Clear the container manually
    mapRef.current._leaflet_id = null;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        const map = L.map(mapRef.current, {
          center: [20.5937, 78.9629],
          zoom: 5,
          zoomControl: true,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add markers and polyline for activeRoute.stops
        const coords = [];
        activeRoute.stops.forEach((stop, i) => {
          const cityCoords = COLD_CHAIN_HUBS[stop.name];
          if (!cityCoords) return;
          coords.push(cityCoords);

          const color = stop.type === 'origin' ? '#00e676'
            : stop.type === 'dest' ? '#00c8f0'
              : '#ffca28';

          const marker = L.circleMarker(cityCoords, {
            radius: 10,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map);

          marker.bindPopup(`
            <b>${stop.name}</b><br/>
            ${stop.type === 'waypoint' ? '🏭 Govt. Approved Cold Chain Hub' : stop.type === 'origin' ? '🟢 Origin' : '🔵 Destination'}<br/>
            ${stop.detail || ''}
          `);
        });

        // Draw route polyline colored by risk
        if (coords.length >= 2) {
          const riskColors = { Low: '#00e676', Medium: '#ffca28', High: '#ff6d00', Critical: '#ff1744' };
          const lineColor = ship ? (riskColors[ship.risk_level] || '#00c8f0') : '#00c8f0';
          L.polyline(coords, { color: lineColor, weight: 4, opacity: 0.9 }).addTo(map);

          import('@turf/turf').then(turf => {
             for (let i = 0; i < coords.length - 1; i++) {
                const p1 = coords[i];
                const p2 = coords[i + 1];
                const pt1 = turf.point([p1[1], p1[0]]);
                const pt2 = turf.point([p2[1], p2[0]]);
                const dist = Math.round(turf.distance(pt1, pt2, { units: 'kilometers' }));
                
                const midLat = (p1[0] + p2[0]) / 2;
                const midLng = (p1[1] + p2[1]) / 2;

                L.marker([midLat, midLng], {
                  icon: L.divIcon({
                    className: 'distance-label',
                    html: `<div style="background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid ${lineColor}; white-space: nowrap;">${dist} km</div>`,
                    iconSize: [60, 20],
                    iconAnchor: [30, 25]
                  })
                }).addTo(map);
             }
          }).catch(err => console.error("Failed to calculate distance:", err));

          map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
        }

      } catch (err) {
        console.error('Map init error:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) { }
        mapInstanceRef.current = null;
      }
    };

  }, [ship?.id, selected, activeRoute?.id]);

  let mlBanner = null;
  if (ship) {
    const isCritical = ship.risk_level === 'Critical' || ship.hours_to_spoilage < 12;
    const isHigh = !isCritical && (ship.risk_level === 'High' || ship.quality_remaining < 40);
    const isMedium = !isCritical && !isHigh && (ship.risk_level === 'Medium');
    const isLow = !isCritical && !isHigh && !isMedium;

    if (isCritical) {
      mlBanner = (
        <div className="route-alert" style={{ background: 'rgba(255,23,68,0.2)', borderColor: 'rgba(255,23,68,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
          <div style={{ color: 'var(--critical)', fontWeight: 700 }}>
            🚨 ML MODEL: Critical risk detected — Express route auto-selected. Only {ship.hours_to_spoilage}h remaining.
          </div>
        </div>
      );
    } else if (isHigh) {
      mlBanner = (
        <div className="route-alert" style={{ background: 'rgba(255,109,0,0.2)', borderColor: 'rgba(255,109,0,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
          <div style={{ color: 'var(--high)', fontWeight: 700 }}>
            ⚠️ ML MODEL: High risk — Cold Hub route recommended to preserve quality ({ship.quality_remaining}% remaining).
          </div>
        </div>
      );
    } else if (isMedium) {
      mlBanner = (
        <div className="route-alert" style={{ background: 'rgba(255,202,40,0.2)', borderColor: 'rgba(255,202,40,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
          <div style={{ color: 'var(--medium)', fontWeight: 700 }}>
            🔶 ML MODEL: Medium risk — Monitor closely. Recommended action: {ship.recommended_action || "Optimize route"}
          </div>
        </div>
      );
    } else if (isLow) {
      mlBanner = (
        <div className="route-alert" style={{ background: 'rgba(0,230,118,0.2)', borderColor: 'rgba(0,230,118,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
          <div style={{ color: 'var(--safe)', fontWeight: 700 }}>
            ✅ ML MODEL: Low risk — Cold Hub route selected for maximum quality preservation.
          </div>
        </div>
      );
    }
  }

  return (
    <div className="route-layout">
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 202, 40, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 202, 40, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 202, 40, 0); }
        }
      `}</style>
      {/* Controls */}
      <div className="panel route-controls-panel">
        <div className="panel-title">◈ ROUTE OPTIMIZATION ENGINE</div>
        <div className="route-controls">
          <div>
            <label className="form-label">SHIPMENT</label>
            <select className="form-select" value={shipId} onChange={e => setShipId(e.target.value)}>
              <option value="">Select shipment...</option>
              {shipments.map(s => (
                <option key={s.id} value={s.id}>
                  {PRODUCT_CONFIG[s.product_type]?.icon} {s.name} ({s.origin} → {s.destination})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">OPTIMIZE FOR</label>
            <select className="form-select" value={objective} onChange={e => setObjective(e.target.value)}>
              {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">VEHICLE</label>
            <select className="form-select" value={vehicle} onChange={e => setVehicle(e.target.value)}>
              {Object.entries(VEHICLE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">MAX STOPS</label>
            <input className="form-input" type="number" value={maxStops} min={0} max={5}
              onChange={e => setMaxStops(parseInt(e.target.value) || 0)} style={{ width: 80 }} />
          </div>
        </div>

        {/* Ship context bar */}
        {ship && (
          <div className="ship-context-bar">
            <span>{cfg.icon} <strong style={{ color: 'var(--white)' }}>{ship.name}</strong></span>
            <span>{ship.qty_kg?.toLocaleString()} kg · {ship.distance_km}km</span>
            <span className={`rb rb-${ship.risk_level}`}>{ship.risk_level} Risk</span>
            <span style={{ color: 'var(--text-secondary)' }}>Quality: {ship.quality_remaining}% · {ship.hours_to_spoilage}h safe</span>
          </div>
        )}
      </div>

      {mlBanner}

      {!ship ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)' }}>
          Select a shipment above to generate optimized routes
        </div>
      ) : (
        <div className="route-main">

          {/* Left panel: 60% */}
          <div className="left-column">

            <div className="panel route-map-panel">
              <div className="panel-title" style={{ justifyContent: 'space-between' }}>
                <span>▶ SELECTED ROUTE — {activeRoute?.tag}</span>
                <span style={{ color: 'var(--dim)', fontSize: 9 }}>{activeRoute?.stops.length} stops · {activeRoute?.dist}km</span>
              </div>
              {activeRoute && (
                <div className="route-viz">
                  {activeRoute.stops.map((stop, i) => (
                    <StopNode key={i} stop={stop} isLast={i === activeRoute.stops.length - 1} />
                  ))}
                </div>
              )}

              {/* Route Stats */}
              {activeRoute && (
                <div className="route-stats">
                  {[
                    { label: 'DISTANCE', val: activeRoute.dist + 'km', color: 'var(--accent)' },
                    { label: 'ETA', val: activeRoute.hrs.toFixed(1) + 'h', color: 'var(--text-primary)' },
                    { label: 'RISK SCORE', val: activeRoute.riskScore + '/100', color: activeRoute.riskScore > 60 ? 'var(--critical)' : activeRoute.riskScore > 35 ? 'var(--high)' : 'var(--safe)' },
                    { label: 'QUALITY SAVED', val: '+' + activeRoute.qualitySaved + '%', color: 'var(--safe)' },
                  ].map((s, i) => (
                    <div className="rstat" key={i}>
                      <div className="rstat-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="rstat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alternative Routes List */}
            <div className="panel alt-panel">
              <div className="panel-title">▶ ROUTE ALTERNATIVES</div>
              <div className="alt-list">
                {routes.map((r, i) => (
                  <div key={r.id} className={`alt-card ${selected === i ? 'active' : ''}`} onClick={() => setSelected(i)}>
                    <div className="alt-card-dot" style={{ backgroundColor: r.color }} />
                    <div className="alt-card-body">
                      <div className="alt-card-name">
                        {r.name} <span className="alt-tag">[{r.tag}]</span>
                      </div>
                      <div className="alt-card-meta">
                        {r.dist}km · {r.hrs.toFixed(1)}h · {r.stops.length} stops
                      </div>
                      <div className="alt-card-meta" style={{ color: 'var(--dim)', fontSize: 9 }}>
                        {r.costSaving}
                      </div>
                    </div>
                    <div className="alt-card-right">
                      <div style={{ fontFamily: 'var(--font-display)', color: r.color, fontSize: 18, fontWeight: 700 }}>
                        +{r.qualitySaved}%
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--dim)' }}>quality saved</div>
                      <div style={{ fontSize: 9, color: r.riskScore > 60 ? 'var(--critical)' : 'var(--safe)', marginTop: 3 }}>
                        Risk: {r.riskScore}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right panel: 40% */}
          <div className="right-column">
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                ref={mapRef}
                key={`map-${ship?.id}-${selected}`}
                style={{ height: '420px', width: '100%', borderRadius: '10px' }}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}