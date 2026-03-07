import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { PRODUCT_CONFIG, VEHICLE_CONFIG } from '../data/constants';
import './Dashboard.css';

const RISK_COLOR = { Low: '#00e676', Medium: '#ffca28', High: '#ff6d00', Critical: '#ff1744' };

// Generate simulated temperature history
function genTempHistory(baseTemp, n = 16) {
  return Array.from({ length: n }, (_, i) => ({
    time: `-${(n - 1 - i) * 5}m`,
    temp: +(baseTemp + Math.sin(i * 0.55) * 1.4 + (Math.random() - 0.5) * 0.9).toFixed(2),
    safe: 4,
  }));
}

// Generate quality forecast
function genQualForecast(quality, hoursSafe) {
  return Array.from({ length: 13 }, (_, i) => {
    const hrs = i * 2;
    const rate = quality / Math.max(hoursSafe, 0.1);
    return { time: `+${hrs}h`, quality: Math.max(0, +(quality - rate * hrs).toFixed(1)) };
  });
}

function ShipCard({ ship, selected, onSelect, onRemove }) {
  const cfg = PRODUCT_CONFIG[ship.product_type] || {};
  const rc = RISK_COLOR[ship.risk_level] || '#fff';
  return (
    <div className={`ship-card ${selected ? 'active' : ''}`} onClick={() => onSelect(ship.id)}>
      <div className="ship-card-left">
        <div className="ship-rank" style={{ borderColor: rc, color: rc }}>#{ship.priority_rank}</div>
        <div className="ship-icon">{cfg.icon || '📦'}</div>
      </div>
      <div className="ship-card-body">
        <div className="ship-card-top">
          <span className="ship-name">{ship.name}</span>
          <span className={`rb rb-${ship.risk_level}`}>{ship.risk_level}</span>
        </div>
        <div className="ship-route">{ship.origin} → {ship.destination} · {ship.distance_km}km</div>
        <div className="ship-stats-row">
          <span className="ship-stat">
            <span style={{ color: rc, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
              {ship.quality_remaining}%
            </span> quality
          </span>
          <span className="ship-stat" style={{ color: ship.hours_to_spoilage < 8 ? '#ff1744' : 'var(--dim)' }}>
            {ship.hours_to_spoilage}h safe
          </span>
          <span className="ship-stat">{(ship.qty_kg || 500).toLocaleString()} kg</span>
        </div>
        <div className="ship-qbar-bg">
          <div className="ship-qbar-fg" style={{ width: ship.quality_remaining + '%', background: rc }} />
        </div>
      </div>
      <button
        className="ship-remove btn btn-ghost btn-sm"
        onClick={e => { e.stopPropagation(); onRemove(ship.id); }}
        title="Remove shipment"
      >✕</button>
    </div>
  );
}

function SensorCard({ label, value, unit, color }) {
  return (
    <div className="sensor-card">
      <div className="sensor-label">{label}</div>
      <div className="sensor-val" style={{ color: color || 'var(--white)' }}>
        {value}<span className="sensor-unit">{unit}</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0c1828', border: '1px solid #1a4060', padding: '8px 12px', borderRadius: 6, fontSize: 11 }}>
      <div style={{ color: '#3a6480', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

export default function Dashboard({ shipments, selected, onSelect, onSpike, onAdd, onRemove }) {
  const sorted = [...shipments].sort((a, b) => a.priority_rank - b.priority_rank);
  const cfg = selected ? (PRODUCT_CONFIG[selected.product_type] || {}) : {};
  const vcfg = selected ? (VEHICLE_CONFIG[selected.vehicle_type] || {}) : {};
  const f = selected?.features || {};

  const tempData  = selected ? genTempHistory(f.avg_temp_c || 5) : [];
  const qualData  = selected ? genQualForecast(selected.quality_remaining, selected.hours_to_spoilage) : [];
  const qc = selected ? (RISK_COLOR[selected.risk_level] || '#fff') : '#fff';

  const tempColor = f.avg_temp_c > (cfg.safeTemp || 4) + 3 ? 'var(--high)'
                  : f.avg_temp_c > (cfg.safeTemp || 4) ? 'var(--medium)'
                  : 'var(--safe)';

  return (
    <div className="dashboard-layout">

      {/* ── LEFT: Shipment List ── */}
      <div className="dash-left">
        <div className="panel" style={{ height: '100%' }}>
          <div className="panel-title" style={{ justifyContent: 'space-between' }}>
            <span>▶ PRIORITY QUEUE</span>
            <button className="btn btn-primary btn-sm" onClick={onAdd}>+ ADD</button>
          </div>
          <div className="ship-list">
            {sorted.map(s => (
              <ShipCard
                key={s.id} ship={s}
                selected={s.id === selected?.id}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Detail ── */}
      <div className="dash-right">

        {/* Row 1 */}
        <div className="detail-row1">

          {/* Quality Panel */}
          <div className="panel">
            <div className="panel-title">◈ PRODUCT QUALITY</div>
            {selected ? (
              <div className="quality-block fade-up">
                <div className="quality-header">
                  <div>
                    <div className="quality-big" style={{ color: qc }}>{selected.quality_remaining}%</div>
                    <div className="quality-bar-bg">
                      <div className="quality-bar-fg" style={{ width: selected.quality_remaining + '%', background: qc }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span className={`rb rb-${selected.risk_level}`}>{selected.risk_level} RISK</span>
                      <span style={{ fontSize: 10, color: selected.hours_to_spoilage < 8 ? 'var(--critical)' : 'var(--dim)' }}>
                        {selected.hours_to_spoilage}h remaining
                      </span>
                    </div>
                  </div>
                  <div className="product-icon-big">{cfg.icon}</div>
                </div>
                <div className="quality-meta">
                  <div className="meta-row"><span className="meta-k">Product</span><span className="meta-v">{cfg.label || selected.product_type}</span></div>
                  <div className="meta-row"><span className="meta-k">Quantity</span><span className="meta-v">{(selected.qty_kg || 500).toLocaleString()} kg</span></div>
                  <div className="meta-row"><span className="meta-k">Vehicle</span><span className="meta-v">{vcfg.icon} {vcfg.label || selected.vehicle_type}</span></div>
                  <div className="meta-row"><span className="meta-k">Route</span><span className="meta-v">{selected.origin} → {selected.destination}</span></div>
                  <div className="meta-row"><span className="meta-k">Safe Temp</span><span className="meta-v" style={{ color: 'var(--safe)' }}>≤ {cfg.safeTemp || 4}°C</span></div>
                  <div className="meta-row">
                    <span className="meta-k">Risk Value</span>
                    <span className="meta-v" style={{ color: 'var(--medium)' }}>
                      ₹{Math.round((selected.qty_kg || 500) * (selected.value_per_kg || 200) * (1 - selected.quality_remaining / 100)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ) : <div className="empty-state">Select a shipment to view details</div>}
          </div>

          {/* Sensors */}
          <div className="panel">
            <div className="panel-title">◈ LIVE SENSOR DATA</div>
            {selected ? (
              <div className="sensor-grid fade-up">
                <SensorCard label="Temperature"    value={(f.avg_temp_c || 0).toFixed(1)} unit="°C" color={tempColor} />
                <SensorCard label="Humidity"       value={(f.humidity_percent || 0).toFixed(0)} unit="%" />
                <SensorCard label="Temp Deviation" value={(f.temp_deviation_degree_hr || 0).toFixed(1)} unit="°h"
                  color={f.temp_deviation_degree_hr > 30 ? 'var(--high)' : 'var(--text)'} />
                <SensorCard label="Damage CDI"     value={(f.cumulative_damage_index || 0).toFixed(2)} unit=""
                  color={f.cumulative_damage_index > 1 ? 'var(--critical)' : f.cumulative_damage_index > 0.4 ? 'var(--high)' : 'var(--safe)'} />
                <SensorCard label="NH₃ (ppm)"      value={(f.nh3_ppm || 0).toFixed(1)} unit=""
                  color={f.nh3_ppm > 6 ? 'var(--high)' : 'var(--text)'} />
                <SensorCard label="Transit"        value={(f.transport_duration_hr || 0).toFixed(1)} unit="h" />
              </div>
            ) : <div className="empty-state">Select a shipment</div>}
          </div>
        </div>

        {/* Row 2: Charts */}
        <div className="detail-row2">

          {/* Temp Chart */}
          <div className="panel">
            <div className="panel-title" style={{ justifyContent: 'space-between' }}>
              <span>▶ TEMPERATURE TREND</span>
              {selected && (
                <button className="btn btn-danger btn-sm" onClick={() => onSpike(selected.id)}>
                  ⚡ INJECT SPIKE
                </button>
              )}
            </div>
            {selected ? (
              <ResponsiveContainer width="100%" height={175}>
                <AreaChart data={tempData}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00c8f0" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00c8f0" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f2e47" />
                  <XAxis dataKey="time" tick={{ fill: '#3a6480', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fill: '#3a6480', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={cfg.safeTemp || 4} stroke="rgba(255,23,68,0.5)" strokeDasharray="5 4"
                    label={{ value: `Safe ${cfg.safeTemp || 4}°C`, fill: 'rgba(255,23,68,0.7)', fontSize: 8 }} />
                  <Area type="monotone" dataKey="temp" stroke="#00c8f0" fill="url(#tempGrad)"
                    strokeWidth={2} dot={{ r: 2, fill: '#00c8f0' }} name="Temp (°C)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="empty-state chart-empty">Select a shipment to view temperature trend</div>}
          </div>

          {/* Quality Forecast */}
          <div className="panel">
            <div className="panel-title">▶ QUALITY DEGRADATION FORECAST</div>
            {selected ? (
              <ResponsiveContainer width="100%" height={175}>
                <AreaChart data={qualData}>
                  <defs>
                    <linearGradient id="qualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={qc} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={qc} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f2e47" />
                  <XAxis dataKey="time" tick={{ fill: '#3a6480', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#3a6480', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={25} stroke="rgba(255,109,0,0.4)" strokeDasharray="4 3"
                    label={{ value: 'Unsafe 25%', fill: 'rgba(255,109,0,0.6)', fontSize: 8 }} />
                  <Area type="monotone" dataKey="quality" stroke={qc} fill="url(#qualGrad)"
                    strokeWidth={2} dot={false} name="Quality (%)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="empty-state chart-empty">Select a shipment to view forecast</div>}
          </div>
        </div>

        {/* Row 3: Actions + Table */}
        <div className="detail-row3">

          {/* AI Recommendations */}
          <div className="panel">
            <div className="panel-title">◈ AI RECOMMENDATIONS</div>
            {selected ? (
              <div className="action-list">
                {(selected.actions || []).map((a, i) => {
                  const cls = a.includes('CRITICAL') || a.includes('EMERGENCY') ? 'crit'
                            : a.includes('HIGH') || a.includes('⚠️') || a.includes('Expedite') ? 'high'
                            : a.includes('MEDIUM') || a.includes('🔶') || a.includes('Monitor') ? 'med' : '';
                  return (
                    <div key={i} className={`action-item ${cls} slide-in`} style={{ animationDelay: `${i * 0.06}s` }}>
                      {a}
                    </div>
                  );
                })}
              </div>
            ) : <div className="empty-state">Select a shipment</div>}
          </div>

          {/* Priority Table */}
          <div className="panel">
            <div className="panel-title">▶ DELIVERY PRIORITY TABLE</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>SHIPMENT</th><th>PRODUCT</th><th>QTY</th>
                    <th>RISK</th><th>QUALITY</th><th>SAFE FOR</th><th>DIST</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(s => {
                    const rc = RISK_COLOR[s.risk_level] || '#fff';
                    const cfg2 = PRODUCT_CONFIG[s.product_type] || {};
                    return (
                      <tr key={s.id} onClick={() => onSelect(s.id)}
                        style={{ background: s.id === selected?.id ? 'rgba(0,200,240,0.04)' : '' }}>
                        <td style={{ fontFamily: 'var(--font-display)', color: s.priority_rank === 1 ? 'var(--critical)' : s.priority_rank === 2 ? 'var(--high)' : 'var(--dim)', fontWeight: 700 }}>
                          #{s.priority_rank}
                        </td>
                        <td>
                          <div style={{ color: 'var(--white)', fontSize: 11 }}>{s.name}</div>
                          <div style={{ color: 'var(--dim)', fontSize: 9 }}>{s.origin} → {s.destination}</div>
                        </td>
                        <td>{cfg2.icon} {cfg2.label || s.product_type}</td>
                        <td style={{ fontFamily: 'var(--font-display)', fontSize: 11 }}>{(s.qty_kg || 500).toLocaleString()}</td>
                        <td><span className={`rb rb-${s.risk_level}`}>{s.risk_level}</span></td>
                        <td style={{ fontFamily: 'var(--font-display)', color: rc, fontWeight: 700 }}>{s.quality_remaining}%</td>
                        <td style={{ color: s.hours_to_spoilage < 8 ? 'var(--critical)' : 'var(--text)', fontFamily: 'var(--font-display)' }}>
                          {s.hours_to_spoilage}h
                        </td>
                        <td style={{ color: 'var(--dim)' }}>{s.distance_km}km</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}