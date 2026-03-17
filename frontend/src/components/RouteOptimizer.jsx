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

const ALL_CITY_COORDS = {
  "Mumbai": [19.076, 72.877], "Delhi": [28.613, 77.209],
  "Pune": [18.520, 73.856], "Nashik": [19.997, 73.789],
  "Bangalore": [12.971, 77.594], "Chennai": [13.083, 80.270],
  "Hyderabad": [17.385, 78.486], "Kolkata": [22.572, 88.363],
  "Ahmedabad": [23.022, 72.571], "Surat": [21.170, 72.831],
  "Jaipur": [26.912, 75.787], "Lucknow": [26.847, 80.947],
  "Kochi": [9.931, 76.267], "Bhopal": [23.259, 77.412],
  "Indore": [22.719, 75.857], "Chandigarh": [30.733, 76.779],
  "Patna": [25.594, 85.137], "Guwahati": [26.144, 91.736],
  "Nagpur": [21.146, 79.088], "Vadodara": [22.307, 73.181],
  "Aurangabad": [19.877, 75.340], "Solapur": [17.687, 75.901],
  "Amritsar": [31.634, 74.872], "Ludhiana": [30.901, 75.857],
  "Agra": [27.176, 78.008], "Kanpur": [26.449, 80.331],
  "Haridwar": [29.945, 78.164], "Shimla": [31.104, 77.173],
  "Guntur": [16.306, 80.436], "Nellore": [14.442, 79.987],
  "Mehsana": [23.600, 72.369], "Banaskantha": [24.174, 72.437],
  "Sabarkantha": [23.583, 73.017], "Raigad": [18.513, 73.183],
  "Kolhapur": [16.705, 74.243], "Sonepat": [28.993, 77.012],
  "Palwal": [28.143, 77.323], "Gurgaon": [28.459, 77.026],
  "Jalandhar": [31.326, 75.576], "Kapurthala": [31.381, 75.380],
  "Solan": [30.909, 77.096], "Noida": [28.535, 77.391],
  "Ghaziabad": [28.669, 77.438], "Kashipur": [29.212, 78.963],
  "Kota": [25.185, 75.839], "Bikaner": [28.022, 73.312],
  "Jabalpur": [23.182, 79.986], "Belgaum": [15.849, 74.497],
  "Coimbatore": [11.016, 76.955], "Kozhikode": [11.258, 75.780],
  "Hooghly": [22.906, 88.390], "Udham Singh Nagar": [28.999, 79.515],
};

function getCityCoords(cityName) {
  if (!cityName) return null;
  if (ALL_CITY_COORDS[cityName]) return ALL_CITY_COORDS[cityName];
  const key = Object.keys(ALL_CITY_COORDS).find(
    k => k.toLowerCase() === cityName.toLowerCase()
  );
  return key ? ALL_CITY_COORDS[key] : null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Dijkstra's Algorithm for shortest cold-hub path ────────────────────────

const HUB_CITIES = [
  "Nagpur", "Nashik", "Surat", "Vadodara", "Ahmedabad", "Indore", "Bhopal",
  "Hyderabad", "Bangalore", "Chennai", "Kochi", "Jaipur", "Agra", "Kanpur",
  "Lucknow", "Chandigarh", "Ludhiana", "Amritsar", "Kolkata", "Solapur",
  "Aurangabad", "Guntur", "Nellore", "Mehsana", "Banaskantha", "Gurgaon",
  "Sonepat", "Noida", "Haridwar", "Shimla", "Kota", "Jabalpur", "Coimbatore",
  "Kozhikode", "Hooghly", "Guwahati", "Patna", "Belgaum", "Raigad", "Kolhapur",
];

/**
 * Dijkstra's shortest path from origin → destination
 * through any hubs that lie within a trimmed bounding box.
 * Returns an array of cold-hub city names along the optimal path (excl. origin & dest).
 */
function findNearestHubs(originName, destName, maxHubs = 2) {
  const oC = getCityCoords(originName);
  const dC = getCityCoords(destName);
  if (!oC || !dC) return [];

  const [oLat, oLng] = oC;
  const [dLat, dLng] = dC;
  const straightDist = haversineKm(oLat, oLng, dLat, dLng);

  // ── Build graph nodes: origin + candidate hubs within bounding box + dest ──
  const bbox = {
    minLat: Math.min(oLat, dLat) - 4,
    maxLat: Math.max(oLat, dLat) + 4,
    minLng: Math.min(oLng, dLng) - 4,
    maxLng: Math.max(oLng, dLng) + 4,
  };

  // Filter hubs inside the bounding box and with acceptable deviation
  const candidates = HUB_CITIES.filter(city => {
    if (city === originName || city === destName) return false;
    const c = getCityCoords(city);
    if (!c) return false;
    const [cLat, cLng] = c;
    if (cLat < bbox.minLat || cLat > bbox.maxLat) return false;
    if (cLng < bbox.minLng || cLng > bbox.maxLng) return false;
    // Reject hubs that add more than 60% extra distance
    const deviation = haversineKm(oLat, oLng, cLat, cLng) + haversineKm(cLat, cLng, dLat, dLng);
    return deviation < straightDist * 1.6;
  });

  if (candidates.length === 0) return [];

  // ── Full graph of all nodes: origin, each candidate hub, destination ──
  const nodes = [originName, ...candidates, destName];

  // ── Dijkstra's Algorithm ──────────────────────────────────────────────────
  // State: current city, set of hubs visited so far (bitmask), accumulated distance
  // We want the path: origin → (1 or 2 hubs, in order) → dest
  // Strategy: run Dijkstra over (city × hubsVisited) state space

  const hubIndex = {};
  candidates.forEach((city, i) => { hubIndex[city] = i; });
  const numHubs = candidates.length;
  const TARGET_MASK = (1 << Math.min(maxHubs, numHubs)) - 1; // We want to visit maxHubs hubs

  // dist[city][mask] = shortest distance to reach city having visited hubs in mask
  const INF = Infinity;
  const distMap = {};
  const prevMap = {};
  nodes.forEach(n => {
    distMap[n] = {};
    prevMap[n] = {};
  });

  distMap[originName][0] = 0;

  // Min-heap priority queue: [distance, cityName, hubMask, path]
  // Simulated with a sorted array (sufficient for this scale, ~50 nodes)
  const pq = [[0, originName, 0, [originName]]];

  while (pq.length > 0) {
    // Pop the minimum-distance entry
    pq.sort((a, b) => a[0] - b[0]);
    const [curDist, curCity, curMask, curPath] = pq.shift();

    // If we reached destination and visited required hubs, record result
    if (curCity === destName) {
      // Extract only the hub waypoints from the path
      const hubsOnPath = curPath.filter(c => c !== originName && c !== destName);
      return hubsOnPath.slice(0, maxHubs);
    }

    // Skip if we already found a better way to this (city, mask) state
    const bestDist = distMap[curCity][curMask];
    if (bestDist !== undefined && curDist > bestDist) continue;

    // Explore neighbours
    for (const nextCity of nodes) {
      if (nextCity === curCity) continue;
      // Don't revisit already-visited hubs (except dest)
      if (nextCity !== destName && curPath.includes(nextCity)) continue;

      const nextCoords = getCityCoords(nextCity);
      const curCoords = getCityCoords(curCity);
      if (!nextCoords || !curCoords) continue;

      const edgeDist = haversineKm(curCoords[0], curCoords[1], nextCoords[0], nextCoords[1]);
      let nextMask = curMask;

      // If nextCity is a hub, mark it visited in mask
      if (hubIndex[nextCity] !== undefined) {
        nextMask = curMask | (1 << hubIndex[nextCity]);
      }

      const newDist = curDist + edgeDist;
      const prevBest = distMap[nextCity][nextMask];

      // For destination, only allow if we have visited at least 1 hub
      if (nextCity === destName && nextMask === 0) continue;

      if (prevBest === undefined || newDist < prevBest) {
        distMap[nextCity][nextMask] = newDist;
        pq.push([newDist, nextCity, nextMask, [...curPath, nextCity]]);
      }
    }
  }

  // Fallback: if Dijkstra yields no hub path, pick the single closest hub
  const ranked = candidates
    .map(city => {
      const c = getCityCoords(city);
      const d = haversineKm(oLat, oLng, c[0], c[1]) + haversineKm(c[0], c[1], dLat, dLng);
      return { city, d };
    })
    .sort((a, b) => a.d - b.d);
  return ranked.slice(0, maxHubs).map(x => x.city);
}

function buildRoutes(ship, vehicle) {
  const vCfg = VEHICLE_CONFIG[vehicle] || VEHICLE_CONFIG['reefer_truck'];
  const speed = vCfg.speedKmh || 60;
  const riskMult = vCfg.riskMult || 1;
  const dist = ship.distance_km;
  const baseHrs = dist / speed;
  const hubs = findNearestHubs(ship.origin, ship.destination, 2);
  const riskBase = ship.risk_index * 25;

  return [
    {
      id: 'express', name: 'EXPRESS ROUTE', tag: 'FASTEST', color: '#00c8f0',
      stops: [
        { name: ship.origin, type: 'origin', detail: 'Immediate departure · No stops · Highway priority' },
        { name: ship.destination, type: 'dest', detail: 'Fastest possible arrival' },
      ],
      dist: Math.round(dist * 0.93), hrs: baseHrs * 0.78,
      riskScore: Math.round(riskBase * riskMult * 1.1),
      qualitySaved: Math.round(14 + ship.risk_index * 6),
      costSaving: `+₹${Math.round(dist * 8)} fuel surcharge`,
    },
    {
      id: 'cold_hub', name: 'COLD HUB ROUTE', tag: 'SAFEST', color: '#ffca28',
      stops: [
        { name: ship.origin, type: 'origin', detail: 'Departure with full pre-cooling protocol' },
        ...hubs.map((h, i) => ({
          name: h, type: 'waypoint',
          detail: i === 0
            ? '🏭 Govt. Approved Cold Chain Hub · Re-icing · Quality inspection'
            : '🏭 Secondary Cold Hub · Temperature audit · Driver handover',
        })),
        { name: ship.destination, type: 'dest', detail: 'Guaranteed quality delivery · Recipient present' },
      ],
      dist: Math.round(dist * 1.14), hrs: baseHrs * 1.22,
      riskScore: Math.round(riskBase * riskMult * 0.55),
      qualitySaved: Math.round(20 + ship.risk_index * 7),
      costSaving: `-₹${Math.round((ship.qty_kg || 500) * (ship.value_per_kg || 200) * 0.12)} spoilage prevention`,
    },
  ];
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
  const [mapKey, setMapKey] = useState(0);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const ship = shipments.find(s => s.id === shipId);
  const activeRoute = routes[selected];
  const cfg = ship ? (PRODUCT_CONFIG[ship.product_type] || {}) : {};

  useEffect(() => { if (defaultShipId) setShipId(defaultShipId); }, [defaultShipId]);

  useEffect(() => {
    if (!ship) return;
    setVehicle(ship.vehicle_type || 'reefer_truck');
    const r = buildRoutes(ship, vehicle);
    const isCritical = ship.risk_level === 'Critical' || ship.hours_to_spoilage < 12;
    const isHigh = !isCritical && (ship.risk_level === 'High' || ship.quality_remaining < 40);
    const defaultIdx = (isCritical || ship.risk_level === 'Medium') ? 0 : 1;
    setRoutes(r);
    setSelected(defaultIdx);
    setMapKey(k => k + 1);
  }, [ship?.id, objective, vehicle, maxStops]);

  useEffect(() => { setMapKey(k => k + 1); }, [selected]);

  // ── MAP ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !activeRoute || !ship) return;

    // Destroy old instance
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.off(); mapInstanceRef.current.remove(); } catch (_) { }
      mapInstanceRef.current = null;
    }
    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    const timer = setTimeout(() => {
      try {
        const map = L.map(mapContainerRef.current, { center: [20.5937, 78.9629], zoom: 5, zoomControl: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors', maxZoom: 18,
        }).addTo(map);
        mapInstanceRef.current = map;

        const RISK_COLORS = { Low: '#00e676', Medium: '#ffca28', High: '#ff6d00', Critical: '#ff1744' };
        const lineColor = RISK_COLORS[ship.risk_level] || '#00c8f0';

        const coords = [];
        activeRoute.stops.forEach(stop => {
          const c = getCityCoords(stop.name);
          if (!c) { console.warn('No coords for:', stop.name); return; }
          coords.push(c);

          const fillColor = stop.type === 'origin' ? '#00e676'
            : stop.type === 'dest' ? '#00c8f0' : '#ffca28';

          L.circleMarker(c, {
            radius: stop.type === 'waypoint' ? 9 : 12,
            fillColor, color: '#fff', weight: 2.5, opacity: 1, fillOpacity: 0.95,
          }).addTo(map).bindPopup(
            `<b>${stop.name}</b><br/>` +
            (stop.type === 'waypoint' ? '🏭 Govt. Approved Cold Chain Hub' : stop.type === 'origin' ? '🟢 Origin' : '🔵 Destination') +
            `<br/><small>${stop.detail}</small>`
          );
        });

        if (coords.length >= 2) {
          L.polyline(coords, { color: lineColor, weight: 5, opacity: 0.85 }).addTo(map);

          // Distance labels
          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i], p2 = coords[i + 1];
            const dist = Math.round(haversineKm(p1[0], p1[1], p2[0], p2[1]));
            L.marker([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], {
              icon: L.divIcon({
                className: '',
                html: `<div style="background:rgba(0,0,0,0.75);color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;border:1px solid ${lineColor};white-space:nowrap;pointer-events:none;">${dist} km</div>`,
                iconSize: [70, 22], iconAnchor: [35, 11],
              }),
            }).addTo(map);
          }

          map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
          setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 300);
        }
      } catch (err) { console.error('Map error:', err); }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.off(); mapInstanceRef.current.remove(); } catch (_) { }
        mapInstanceRef.current = null;
      }
    };
  }, [mapKey]);

  // ── ML BANNER ────────────────────────────────────────────────
  let mlBanner = null;
  if (ship) {
    const isCritical = ship.risk_level === 'Critical' || ship.hours_to_spoilage < 12;
    const isHigh = !isCritical && (ship.risk_level === 'High' || ship.quality_remaining < 40);
    const isMedium = !isCritical && !isHigh && ship.risk_level === 'Medium';
    if (isCritical)
      mlBanner = <div className="route-alert" style={{ background: 'rgba(255,23,68,0.15)', borderColor: 'rgba(255,23,68,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}><div style={{ color: 'var(--critical)', fontWeight: 700 }}>🚨 ML MODEL: Critical risk — Express route auto-selected. Only {ship.hours_to_spoilage}h remaining.</div></div>;
    else if (isHigh)
      mlBanner = <div className="route-alert" style={{ background: 'rgba(255,109,0,0.15)', borderColor: 'rgba(255,109,0,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}><div style={{ color: 'var(--high)', fontWeight: 700 }}>⚠️ ML MODEL: High risk — Cold Hub route recommended ({ship.quality_remaining}% quality remaining).</div></div>;
    else if (isMedium)
      mlBanner = <div className="route-alert" style={{ background: 'rgba(255,202,40,0.15)', borderColor: 'rgba(255,202,40,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}><div style={{ color: 'var(--medium)', fontWeight: 700 }}>🔶 ML MODEL: Medium risk — Action: {ship.recommended_action || 'Monitor closely'}</div></div>;
    else
      mlBanner = <div className="route-alert" style={{ background: 'rgba(0,230,118,0.15)', borderColor: 'rgba(0,230,118,0.5)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}><div style={{ color: 'var(--safe)', fontWeight: 700 }}>✅ ML MODEL: Low risk — Cold Hub route selected for maximum quality preservation.</div></div>;
  }

  return (
    <div className="route-layout">
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

            <div className="panel alt-panel">
              <div className="panel-title">▶ ROUTE ALTERNATIVES</div>
              <div className="alt-list">
                {routes.map((r, i) => (
                  <div key={r.id} className={`alt-card ${selected === i ? 'active' : ''}`} onClick={() => setSelected(i)}>
                    <div className="alt-card-dot" style={{ backgroundColor: r.color }} />
                    <div className="alt-card-body">
                      <div className="alt-card-name">{r.name} <span className="alt-tag">[{r.tag}]</span></div>
                      <div className="alt-card-meta">{r.dist}km · {r.hrs.toFixed(1)}h · {r.stops.length} stops</div>
                      <div className="alt-card-meta" style={{ color: 'var(--dim)', fontSize: 9 }}>{r.costSaving}</div>
                    </div>
                    <div className="alt-card-right">
                      <div style={{ fontFamily: 'var(--font-display)', color: r.color, fontSize: 18, fontWeight: 700 }}>+{r.qualitySaved}%</div>
                      <div style={{ fontSize: 9, color: 'var(--dim)' }}>quality saved</div>
                      <div style={{ fontSize: 9, color: r.riskScore > 60 ? 'var(--critical)' : 'var(--safe)', marginTop: 3 }}>Risk: {r.riskScore}/100</div>
                    </div>
                  </div>
                ))}
              </div>
              {ship && ship.risk_index >= 2 && (
                <div className="route-alert">
                  <div style={{ color: 'var(--critical)', fontWeight: 700, marginBottom: 6 }}>⚡ HIGH URGENCY DETECTED</div>
                  <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                    {ship.quality_remaining}% quality · only {ship.hours_to_spoilage}h safe window.
                    <strong style={{ color: 'var(--white)' }}> EXPRESS ROUTE recommended.</strong>
                    {' '}Estimated ₹{Math.round((ship.qty_kg || 500) * (ship.value_per_kg || 200) * 0.18).toLocaleString('en-IN')} value saved.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="right-column">
            <div className="panel" style={{ padding: 0, overflow: 'hidden', borderRadius: 10 }}>
              <div
                key={mapKey}
                ref={mapContainerRef}
                style={{ height: '520px', width: '100%', borderRadius: 10 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}