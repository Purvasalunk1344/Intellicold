import { useState, useEffect } from 'react';
import { PRODUCT_CONFIG, VEHICLE_CONFIG, CITY_GRAPH } from '../data/constants';
import './RouteOptimizer.css';

const OBJECTIVES = [
  { value: 'balanced', label: 'Balanced (Risk + Time)' },
  { value: 'fastest',  label: 'Fastest Delivery' },
  { value: 'safest',   label: 'Safest Route (Min Exposure)' },
  { value: 'economic', label: 'Most Economic' },
];

function findIntermediates(origin, dest) {
  const graph = CITY_GRAPH;
  const originConns = Object.keys(graph[origin] || {});
  const destConns   = Object.keys(graph[dest] || {});
  const shared = originConns.filter(c => destConns.includes(c) || graph[c]?.[dest]);
  const fallback = ['Nagpur', 'Hyderabad', 'Pune', 'Ahmedabad', 'Bangalore', 'Chennai'];
  const candidates = [...new Set([...shared, ...fallback])].filter(c => c !== origin && c !== dest);
  return candidates.slice(0, 4);
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
      id: 'optimal',
      name: 'OPTIMAL ROUTE',
      tag: objective === 'fastest' ? 'FASTEST' : objective === 'safest' ? 'SAFEST' : 'RECOMMENDED',
      color: '#00e676',
      stops: [
        { name: ship.origin, type: 'origin', detail: 'Departure · Loading complete · Pre-cooling verified' },
        ...(maxStops >= 1 && mids[0] ? [{ name: mids[0], type: 'waypoint', detail: 'Checkpoint · Temperature log · Driver break' }] : []),
        { name: ship.destination, type: 'dest', detail: 'Final delivery · Recipient notified · Quality check on arrival' },
      ],
      dist,
      hrs: baseHrs,
      riskScore: Math.round(riskBase * riskMult * 0.85),
      qualitySaved: Math.round(10 + ship.risk_index * 5),
      costSaving: '₹0 (Baseline)',
    },
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

  // Sort by objective
  if (objective === 'fastest') return [routes[1], routes[0], routes[2]];
  if (objective === 'safest')  return [routes[2], routes[0], routes[1]];
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
        {stop.type === 'origin'   && <span className="rb rb-Low"    style={{ fontSize: 8, marginTop: 4, display: 'inline-block' }}>ORIGIN</span>}
        {stop.type === 'dest'     && <span className="rb rb-High"   style={{ fontSize: 8, marginTop: 4, display: 'inline-block', background: 'rgba(0,200,240,0.1)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>DESTINATION</span>}
      </div>
    </div>
  );
}

export default function RouteOptimizer({ shipments, defaultShipId }) {
  const [shipId,    setShipId]    = useState(defaultShipId || '');
  const [objective, setObjective] = useState('balanced');
  const [vehicle,   setVehicle]   = useState('reefer_truck');
  const [maxStops,  setMaxStops]  = useState(2);
  const [selected,  setSelected]  = useState(0);
  const [routes,    setRoutes]    = useState([]);

  const ship = shipments.find(s => s.id === shipId);

  useEffect(() => {
    if (defaultShipId) setShipId(defaultShipId);
  }, [defaultShipId]);

  useEffect(() => {
    if (ship) {
      setVehicle(ship.vehicle_type || 'reefer_truck');
      const r = buildRoutes(ship, objective, vehicle, maxStops);
      setRoutes(r);
      setSelected(0);
    }
  }, [ship?.id, objective, vehicle, maxStops]);

  const cfg  = ship ? (PRODUCT_CONFIG[ship.product_type] || {}) : {};
  const activeRoute = routes[selected];

  return (
    <div className="route-layout">

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

      {!ship ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)' }}>
          Select a shipment above to generate optimized routes
        </div>
      ) : (
        <div className="route-main">

          {/* Route Map */}
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
                  { label: 'DISTANCE',      val: activeRoute.dist + 'km',            color: 'var(--accent)' },
                  { label: 'ETA', val: activeRoute.hrs.toFixed(1) + 'h', color: 'var(--text-primary)' },
                  { label: 'RISK SCORE',    val: activeRoute.riskScore + '/100',     color: activeRoute.riskScore > 60 ? 'var(--critical)' : activeRoute.riskScore > 35 ? 'var(--high)' : 'var(--safe)' },
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

          {/* Alternative Routes */}
          <div className="panel alt-panel">
            <div className="panel-title">▶ ROUTE ALTERNATIVES</div>
            <div className="alt-list">
              {routes.map((r, i) => (
                <div key={r.id} className={`alt-card ${selected === i ? 'active' : ''}`} onClick={() => setSelected(i)}>
                  <div className="alt-card-dot" style={{ ro: r.color }} />
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

            {/* Recommendation Box */}
            {ship && ship.risk_index >= 2 && (
              <div className="route-alert">
                <div style={{ color: 'var(--critical)', fontWeight: 700, marginBottom: 6 }}>
                  ⚡ HIGH URGENCY DETECTED
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                  {ship.quality_remaining}% quality remaining with only {ship.hours_to_spoilage}h safe window.
                  <strong style={{ color: 'var(--white)' }}> EXPRESS ROUTE recommended</strong> to maximize
                  delivery success. Estimated ₹{Math.round((ship.qty_kg || 500) * (ship.value_per_kg || 200) * 0.18).toLocaleString('en-IN')} value saved.
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}