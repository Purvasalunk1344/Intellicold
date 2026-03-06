import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { PRODUCT_CONFIG } from '../data/constants';
// import './Financial.css';

const RISK_COLORS = ['#00e676', '#ffca28', '#ff6d00', '#ff1744'];
const RISK_NAMES  = ['Low', 'Medium', 'High', 'Critical'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0c1828', border: '1px solid #1a4060', padding: '8px 12px', borderRadius: 6, fontSize: 11 }}>
      <div style={{ color: '#3a6480', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff' }}>
          {p.name}: <strong>₹{Number(p.value).toLocaleString('en-IN')}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Financial({ shipments }) {
  const totalValue = shipments.reduce((a, s) => a + (s.qty_kg || 500) * (s.value_per_kg || 200), 0);
  const totalLoss  = shipments.reduce((a, s) => {
    const qty = s.qty_kg || 500, val = s.value_per_kg || 200;
    return a + qty * val * (1 - s.quality_remaining / 100);
  }, 0);
  const preserved = totalValue - totalLoss;

  // Bar chart data
  const barData = shipments.map(s => {
    const qty = s.qty_kg || 500, val = s.value_per_kg || 200;
    return {
      name: s.name.split(' ').slice(0, 2).join(' '),
      'Safe Value': Math.round(qty * val * s.quality_remaining / 100),
      'At Risk':    Math.round(qty * val * (1 - s.quality_remaining / 100)),
    };
  });

  // Pie chart data
  const riskCounts = [0, 0, 0, 0];
  shipments.forEach(s => { riskCounts[s.risk_index] = (riskCounts[s.risk_index] || 0) + 1; });
  const pieData = RISK_NAMES.map((n, i) => ({ name: n, value: riskCounts[i] })).filter(d => d.value > 0);

  // Per-product breakdown
  const byProduct = {};
  shipments.forEach(s => {
    const key = s.product_type;
    if (!byProduct[key]) byProduct[key] = { qty: 0, value: 0, loss: 0 };
    const qty = s.qty_kg || 500, val = s.value_per_kg || 200;
    byProduct[key].qty   += qty;
    byProduct[key].value += qty * val;
    byProduct[key].loss  += qty * val * (1 - s.quality_remaining / 100);
  });

  // Intervention savings estimate
  const interventionSavings = shipments
    .filter(s => s.risk_index >= 1)
    .map(s => ({
      ...s,
      saving: Math.round((s.qty_kg || 500) * (s.value_per_kg || 200) * 0.15),
    }));

  return (
    <div className="fin-layout">

      {/* KPI Row */}
      <div className="fin-kpi-row">
        {[
          { label: 'Total Cargo Value',  val: '₹' + Math.round(totalValue / 1000) + 'K', color: 'var(--accent)', sub: `${shipments.length} shipments` },
          { label: 'Value Preserved',    val: '₹' + Math.round(preserved / 1000) + 'K',  color: 'var(--safe)',   sub: (preserved / totalValue * 100).toFixed(1) + '% of cargo' },
          { label: 'Projected Loss',     val: '₹' + Math.round(totalLoss / 1000) + 'K',  color: 'var(--critical)', sub: (totalLoss / totalValue * 100).toFixed(1) + '% loss rate' },
          { label: 'Intervention Saves', val: '₹' + interventionSavings.reduce((a, s) => a + s.saving, 0).toLocaleString('en-IN'),
            color: 'var(--medium)', sub: 'If acted on now' },
        ].map((c, i) => (
          <div className="fin-kpi" key={i}>
            <div className="fin-kpi-label">{c.label}</div>
            <div className="fin-kpi-val" style={{ color: c.color }}>{c.val}</div>
            <div className="fin-kpi-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="fin-charts-row">

        {/* Stacked Bar */}
        <div className="panel">
          <div className="panel-title">▶ VALUE AT RISK — PER SHIPMENT</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0f2e47" />
              <XAxis dataKey="name" tick={{ fill: '#3a6480', fontSize: 9, fontFamily: 'JetBrains Mono' }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fill: '#3a6480', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickFormatter={v => '₹' + Math.round(v / 1000) + 'K'} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Safe Value" fill="rgba(0,230,118,0.45)"  stroke="#00e676" strokeWidth={1} stackId="a" />
              <Bar dataKey="At Risk"    fill="rgba(255,23,68,0.45)"   stroke="#ff1744" strokeWidth={1} stackId="a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="panel">
          <div className="panel-title">▶ RISK DISTRIBUTION</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" outerRadius={80} innerRadius={45}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={RISK_COLORS[RISK_NAMES.indexOf(entry.name)]} opacity={0.8} />
                ))}
              </Pie>
              <Legend formatter={(value) => <span style={{ color: 'var(--text)', fontSize: 10 }}>{value}</span>} />
              <Tooltip formatter={(v) => [`${v} shipment${v > 1 ? 's' : ''}`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="fin-bottom-row">

        {/* Product Breakdown */}
        <div className="panel">
          <div className="panel-title">▶ BY PRODUCT TYPE</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>PRODUCT</th><th>TOTAL QTY</th><th>TOTAL VALUE</th>
                <th>PROJECTED LOSS</th><th>LOSS %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byProduct).map(([k, d]) => {
                const cfg = PRODUCT_CONFIG[k] || {};
                const pct = (d.loss / d.value * 100).toFixed(1);
                return (
                  <tr key={k} style={{ cursor: 'default' }}>
                    <td><span style={{ fontSize: 16, marginRight: 6 }}>{cfg.icon}</span>{cfg.label || k}</td>
                    <td style={{ fontFamily: 'var(--font-display)' }}>{d.qty.toLocaleString()} kg</td>
                    <td style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>₹{Math.round(d.value).toLocaleString('en-IN')}</td>
                    <td style={{ color: d.loss > 0 ? 'var(--critical)' : 'var(--safe)', fontFamily: 'var(--font-display)' }}>
                      ₹{Math.round(d.loss).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: pct + '%', height: '100%', background: parseFloat(pct) > 40 ? '#ff1744' : parseFloat(pct) > 20 ? '#ff6d00' : '#00e676', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 10, color: parseFloat(pct) > 40 ? 'var(--critical)' : parseFloat(pct) > 20 ? 'var(--high)' : 'var(--safe)', width: 36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Intervention recommendations */}
        <div className="panel">
          <div className="panel-title">◈ LOSS PREVENTION ACTIONS</div>
          {interventionSavings.length === 0 ? (
            <div style={{ color: 'var(--safe)', fontSize: 11, padding: '20px 0' }}>
              ✅ All shipments within acceptable risk range — no urgent interventions required.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {interventionSavings.map(s => {
                const cfg = PRODUCT_CONFIG[s.product_type] || {};
                const cls = s.risk_index >= 3 ? 'crit' : s.risk_index >= 2 ? 'high' : 'med';
                return (
                  <div key={s.id} className={`action-item ${cls}`} style={{
                    padding: '12px 14px', borderRadius: 6, fontSize: 11, lineHeight: 1.6,
                    borderLeft: `3px solid ${RISK_COLORS[s.risk_index]}`,
                    background: s.risk_index >= 3 ? 'rgba(255,23,68,0.05)' : s.risk_index >= 2 ? 'rgba(255,109,0,0.05)' : 'rgba(255,202,40,0.04)',
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--white)', marginBottom: 4 }}>
                      {cfg.icon} {s.name} <span className={`rb rb-${s.risk_level}`}>{s.risk_level}</span>
                    </div>
                    <div>
                      Potential savings with immediate action:
                      <strong style={{ color: 'var(--safe)', marginLeft: 5 }}>₹{s.saving.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ color: 'var(--dim)', fontSize: 10, marginTop: 3 }}>
                      → {s.risk_index >= 2
                          ? 'Expedite delivery + max cooling immediately'
                          : 'Increase cooling intensity + monitor every 15 min'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* IntelliCold savings estimate */}
          <div className="intellicold-savings">
            <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 8 }}>
              INTELLICOLD SYSTEM VALUE
            </div>
            <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.8 }}>
              Traditional systems alert <em style={{ color: 'var(--medium)' }}>after</em> threshold breach.
              IntelliCold's predictive model identifies risk{' '}
              <strong style={{ color: 'var(--safe)' }}>hours in advance</strong>, enabling proactive
              intervention and saving an estimated{' '}
              <strong style={{ color: 'var(--accent)', fontSize: 14 }}>
                ₹{Math.round(interventionSavings.reduce((a, s) => a + s.saving, 0)).toLocaleString('en-IN')}
              </strong>{' '}
              on this fleet alone.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}