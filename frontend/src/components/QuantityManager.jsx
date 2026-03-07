import { useState } from 'react';
import { PRODUCT_CONFIG, VEHICLE_CONFIG } from '../data/constants';
import './QuantityManager.css';

const RISK_COLOR = { Low: '#00e676', Medium: '#ffca28', High: '#ff6d00', Critical: '#ff1744' };

function QtyRow({ ship, onUpdate }) {
  const [qty, setQty]   = useState(ship.qty_kg   || 500);
  const [val, setVal]   = useState(ship.value_per_kg || 200);
  const cfg = PRODUCT_CONFIG[ship.product_type] || {};
  const rc  = RISK_COLOR[ship.risk_level] || '#fff';

  const totalVal = qty * val;
  const lossAmt  = Math.round(totalVal * (1 - ship.quality_remaining / 100));
  const lossPct  = (100 - ship.quality_remaining).toFixed(1);

  const apply = (newQty, newVal) => {
    onUpdate(ship.id, newQty, newVal);
  };

  const handleQty = (v) => { const n = Math.max(1, parseInt(v) || 1); setQty(n); apply(n, val); };
  const handleVal = (v) => { const n = Math.max(1, parseInt(v) || 1); setVal(n); apply(qty, n); };

  return (
    <div className="qty-row">
      {/* Left: Identity */}
      <div className="qty-identity">
        <div className="qty-icon">{cfg.icon || '📦'}</div>
        <div>
          <div className="qty-name">{ship.name}</div>
          <div className="qty-sub">{ship.origin} → {ship.destination} · {ship.distance_km}km</div>
          <div style={{ marginTop: 5 }}>
            <span className={`rb rb-${ship.risk_level}`}>{ship.risk_level}</span>
            <span style={{ fontSize: 9, color: 'var(--dim)', marginLeft: 8 }}>
              {ship.quality_remaining}% quality · {ship.hours_to_spoilage}h safe
            </span>
          </div>
          <div className="qty-qbar-bg">
            <div className="qty-qbar-fg" style={{ width: ship.quality_remaining + '%', background: rc }} />
          </div>
        </div>
      </div>

      {/* Middle: Financial */}
      <div className="qty-finance">
        <div className="qty-fin-row">
          <span style={{ color: 'var(--dim)', fontSize: 9 }}>Total Value</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--accent)' }}>
            ₹{totalVal.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="qty-fin-row">
          <span style={{ color: 'var(--dim)', fontSize: 9 }}>Projected Loss</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: lossAmt > 0 ? 'var(--critical)' : 'var(--safe)' }}>
            ₹{lossAmt.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="qty-fin-row">
          <span style={{ color: 'var(--dim)', fontSize: 9 }}>Loss %</span>
          <span style={{ fontSize: 12, color: parseFloat(lossPct) > 50 ? 'var(--critical)' : parseFloat(lossPct) > 20 ? 'var(--high)' : 'var(--safe)' }}>
            {lossPct}%
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="qty-controls">
        <div className="qty-field">
          <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2, marginBottom: 4 }}>QUANTITY (KG)</div>
          <div className="qty-spinner">
            <button className="spin-btn" onClick={() => handleQty(qty - 50)}>−</button>
            <input
              type="number" value={qty} min="1"
              className="spin-inp"
              onChange={e => handleQty(e.target.value)}
            />
            <button className="spin-btn" onClick={() => handleQty(qty + 50)}>+</button>
          </div>
          <div style={{ fontSize: 8, color: 'var(--dim)', marginTop: 3, textAlign: 'center' }}>
            {cfg.unit && `Unit: ${cfg.unit}`}
          </div>
        </div>

        <div className="qty-field">
          <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2, marginBottom: 4 }}>VALUE (₹/KG)</div>
          <div className="qty-spinner">
            <button className="spin-btn" onClick={() => handleVal(val - 50)}>−</button>
            <input
              type="number" value={val} min="1"
              className="spin-inp"
              onChange={e => handleVal(e.target.value)}
            />
            <button className="spin-btn" onClick={() => handleVal(val + 50)}>+</button>
          </div>
          <div style={{ fontSize: 8, color: 'var(--dim)', marginTop: 3, textAlign: 'center' }}>
            Market rate
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuantityManager({ shipments, onUpdate, onAdd }) {
  const totalCargo = shipments.reduce((a, s) => a + (s.qty_kg || 500), 0);
  const atRisk     = shipments.filter(s => s.risk_index >= 1).reduce((a, s) => a + (s.qty_kg || 500), 0);
  const totalLoss  = shipments.reduce((a, s) => {
    const qty = s.qty_kg || 500, val = s.value_per_kg || 200;
    return a + qty * val * (1 - s.quality_remaining / 100);
  }, 0);
  const totalValue = shipments.reduce((a, s) => a + (s.qty_kg || 500) * (s.value_per_kg || 200), 0);

  return (
    <div className="qty-layout">

      {/* Summary bar */}
      <div className="qty-summary-bar">
        {[
          { label: 'Total Cargo',    val: totalCargo.toLocaleString() + ' kg',         color: 'var(--accent)' },
          { label: 'Total Value',    val: '₹' + Math.round(totalValue / 1000) + 'K',   color: 'var(--white)' },
          { label: 'Cargo at Risk',  val: atRisk.toLocaleString() + ' kg',             color: 'var(--high)' },
          { label: 'Projected Loss', val: '₹' + Math.round(totalLoss / 1000) + 'K',   color: 'var(--critical)' },
          { label: 'Value Preserved',val: '₹' + Math.round((totalValue - totalLoss) / 1000) + 'K', color: 'var(--safe)' },
        ].map((c, i) => (
          <div className="qty-sum-card" key={i}>
            <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: c.color, marginTop: 4 }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="panel">
        <div className="panel-title" style={{ justifyContent: 'space-between' }}>
          <span>◈ CARGO QUANTITY MANAGER</span>
          <button className="btn btn-primary" onClick={onAdd}>+ ADD SHIPMENT</button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.7 }}>
          Adjust cargo quantities and market value per kg. Changes instantly recalculate financial exposure and spoilage risk across the fleet.
        </div>

        <div className="qty-grid">
          {shipments.map(s => (
            <QtyRow key={s.id} ship={s} onUpdate={onUpdate} />
          ))}
        </div>
      </div>

      {/* Product reference table */}
      <div className="panel">
        <div className="panel-title">▶ PERISHABLE GOODS REFERENCE</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>PRODUCT</th><th>SAFE TEMP</th><th>SHELF LIFE</th>
                <th>DEFAULT VALUE</th><th>KEY RISK FACTORS</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PRODUCT_CONFIG).map(([k, p]) => (
                <tr key={k} style={{ cursor: 'default' }}>
                  <td><span style={{ fontSize: 16, marginRight: 6 }}>{p.icon}</span>{p.label}</td>
                  <td style={{ color: 'var(--safe)' }}>≤ {p.safeTemp}°C</td>
                  <td>{p.shelfDays} days</td>
                  <td>₹{p.valuePerKg}/kg</td>
                  <td style={{ color: 'var(--dim)', fontSize: 10 }}>
                    {k === 'meat'    && 'Temperature, H₂S gas, humidity'}
                    {k === 'seafood' && 'Temperature, NH₃, H₂S levels'}
                    {k === 'fish'    && 'Temperature, NH₃ gas, exposure time'}
                    {k === 'milk'    && 'Temperature, transit duration'}
                    {k === 'yogurt' && 'Temperature stability, vibration'}
                    {k === 'fruit'  && 'Ethylene buildup, temperature'}
                    {k === 'vegetable' && 'Humidity, ethylene, temperature'}
                    {k === 'eggs'   && 'Temperature, humidity, impact'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}