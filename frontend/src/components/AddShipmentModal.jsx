import { useState } from 'react';
import { PRODUCT_CONFIG, VEHICLE_CONFIG, INDIAN_CITIES } from '../data/constants';
// import './AddShipmentModal.css';

export default function AddShipmentModal({ onAdd, onClose, existingCount }) {
  const [form, setForm] = useState({
    name: '', product_type: 'milk', origin: 'Mumbai', destination: 'Delhi',
    distance_km: 500, qty_kg: 500, vehicle_type: 'reefer_truck',
    avg_temp_c: 4, humidity_percent: 65, value_per_kg: '',
  });

  const cfg = PRODUCT_CONFIG[form.product_type] || {};

  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v,
    ...(k === 'product_type' ? { value_per_kg: PRODUCT_CONFIG[v]?.valuePerKg || 200 } : {}),
  }));

  const handleSubmit = () => {
    const id = 'S' + Date.now().toString().slice(-5);
    const riskIdx = form.avg_temp_c > (cfg.safeTemp || 4) + 4 ? 2
                  : form.avg_temp_c > (cfg.safeTemp || 4) ? 1 : 0;
    const riskLevel = ['Low', 'Medium', 'High', 'Critical'][riskIdx];
    const quality   = Math.max(0, 100 - riskIdx * 15 - Math.random() * 5);
    const hours     = Math.max(0, 48 - riskIdx * 12);

    onAdd({
      id, name: form.name || `${cfg.label} Shipment`,
      origin: form.origin, destination: form.destination,
      distance_km: parseInt(form.distance_km) || 500,
      product_type: form.product_type,
      vehicle_type: form.vehicle_type,
      qty_kg: parseInt(form.qty_kg) || 500,
      value_per_kg: parseInt(form.value_per_kg) || cfg.valuePerKg || 200,
      quality_remaining: +quality.toFixed(1),
      risk_level: riskLevel, risk_index: riskIdx,
      hours_to_spoilage: +hours.toFixed(1),
      priority_rank: existingCount + 1,
      actions: riskIdx === 0
        ? ['✅ SAFE: New shipment added — monitoring started']
        : riskIdx === 1
        ? ['🔶 MEDIUM: Temperature above safe range — monitor closely']
        : ['⚠️ HIGH RISK: Elevated temperature — take immediate action'],
      features: {
        avg_temp_c: parseFloat(form.avg_temp_c) || 4,
        humidity_percent: parseFloat(form.humidity_percent) || 65,
        temp_deviation_degree_hr: riskIdx * 15,
        cumulative_damage_index: riskIdx * 0.3,
        transport_duration_hr: 0,
        nh3_ppm: riskIdx * 2,
      },
      readings: [],
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">+ ADD NEW SHIPMENT</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Product Preview */}
          <div className="product-preview">
            <span className="preview-icon">{cfg.icon}</span>
            <div>
              <div style={{ color: 'var(--white)', fontSize: 14, fontWeight: 600 }}>{cfg.label || form.product_type}</div>
              <div style={{ color: 'var(--dim)', fontSize: 9, marginTop: 2 }}>
                Safe temp: ≤{cfg.safeTemp}°C · Shelf life: {cfg.shelfDays} days · Default: ₹{cfg.valuePerKg}/kg
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Shipment Name</label>
              <input className="form-input" placeholder={`e.g. ${cfg.label} Batch A`}
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Product Type</label>
              <select className="form-select" value={form.product_type} onChange={e => set('product_type', e.target.value)}>
                {Object.entries(PRODUCT_CONFIG).map(([k, p]) => (
                  <option key={k} value={k}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Origin City</label>
              <select className="form-select" value={form.origin} onChange={e => set('origin', e.target.value)}>
                {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Destination City</label>
              <select className="form-select" value={form.destination} onChange={e => set('destination', e.target.value)}>
                {INDIAN_CITIES.filter(c => c !== form.origin).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Distance (km)</label>
              <input className="form-input" type="number" min="10"
                value={form.distance_km} onChange={e => set('distance_km', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Quantity (kg)</label>
              <input className="form-input" type="number" min="1"
                value={form.qty_kg} onChange={e => set('qty_kg', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Vehicle Type</label>
              <select className="form-select" value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
                {Object.entries(VEHICLE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Value per kg (₹)</label>
              <input className="form-input" type="number" min="1"
                placeholder={`Default: ₹${cfg.valuePerKg}`}
                value={form.value_per_kg} onChange={e => set('value_per_kg', e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">
                Current Temp (°C) — Safe: ≤{cfg.safeTemp}°C
              </label>
              <input className="form-input" type="number" step="0.5"
                value={form.avg_temp_c} onChange={e => set('avg_temp_c', e.target.value)} />
              {parseFloat(form.avg_temp_c) > (cfg.safeTemp || 4) && (
                <div style={{ fontSize: 9, color: 'var(--high)', marginTop: 4 }}>
                  ⚠ Above safe temperature — shipment will start as medium risk
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Humidity (%)</label>
              <input className="form-input" type="number" min="0" max="100"
                value={form.humidity_percent} onChange={e => set('humidity_percent', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSubmit}>ADD SHIPMENT</button>
        </div>
      </div>
    </div>
  );
}