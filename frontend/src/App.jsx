// import { useState, useEffect } from 'react';
// import { useShipments } from './hooks/useShipments';
// import Dashboard from './components/Dashboard';
// import RouteOptimizer from './components/RouteOptimizer';
// import QuantityManager from './components/QuantityManager';
// import Financial from './components/Financial';
// import AddShipmentModal from './components/AddShipmentModal';
// import AppContent from './AppContent'; 
// import { ThemeProvider } from './contexts/ThemeContext';
// import { useTheme } from './contexts/ThemeContext';
// import './App.css';

// const TABS = [
//   { id: 'dashboard', label: 'DASHBOARD' },
//   { id: 'route',     label: 'ROUTE OPTIMIZER' },
//   { id: 'quantity',  label: 'QUANTITY MGR' },
//   { id: 'financial', label: 'FINANCIAL' },
// ];

// function Clock() {
//   const [time, setTime] = useState(new Date());
//   useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
//   return <span className="clock">{time.toLocaleTimeString()}</span>;
// }

// export default function App() {
//   const { theme, toggleTheme } = useTheme();
//   const [tab, setTab] = useState('dashboard');
//   const [selectedId, setSelectedId] = useState(null);
//   const [showAdd, setShowAdd] = useState(false);

//   const { shipments, loading, online, lastUpdate, updateQty, addShipment, removeShipment, injectSpike } = useShipments();

//   useEffect(() => {
//     if (!selectedId && shipments.length) setSelectedId(shipments[0].id);
//   }, [shipments, selectedId]);

//   const selected = shipments.find(s => s.id === selectedId) || null;
//   const criticalCount = shipments.filter(s => s.risk_level === 'Critical').length;
//   const avgQuality = shipments.length ? (shipments.reduce((a, s) => a + s.quality_remaining, 0) / shipments.length).toFixed(1) : 0;
//   const totalRisk = shipments.reduce((a, s) => {
//     if (s.risk_index >= 1) return a + (s.qty_kg || 500) * (s.value_per_kg || 200) * (1 - s.quality_remaining / 100);
//     return a;
//   }, 0);

//   const handleAddShipment = (ship) => {
//     addShipment(ship);
//     setSelectedId(ship.id);
//     setShowAdd(false);
//   };

//   return (
//     <ThemeProvider>
//       <AppContent />
//     </ThemeProvider>
//   );
// }

import { useState, useEffect } from 'react';
import { useShipments } from './hooks/useShipments';
import Dashboard from './components/Dashboard';
import RouteOptimizer from './components/RouteOptimizer';
import QuantityManager from './components/QuantityManager';
import Financial from './components/Financial';
import AddShipmentModal from './components/AddShipmentModal';
import VoiceAssistant from './components/VoiceAssistant';
import './App.css';

const TABS = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'route',     label: 'ROUTE OPTIMIZER' },
  { id: 'quantity',  label: 'QUANTITY MGR' },
  { id: 'financial', label: 'FINANCIAL' },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { 
    const id = setInterval(() => setTime(new Date()), 1000); 
    return () => clearInterval(id); 
  }, []);
  return <span className="clock">{time.toLocaleTimeString()}</span>;
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [theme, setTheme] = useState('dark'); // Simple theme state

  const { shipments, loading, online, lastUpdate, updateQty, addShipment, removeShipment, injectSpike } = useShipments();

  useEffect(() => {
    if (!selectedId && shipments.length) setSelectedId(shipments[0].id);
  }, [shipments, selectedId]);

  // Apply theme to document
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const selected = shipments.find(s => s.id === selectedId) || null;
  const criticalCount = shipments.filter(s => s.risk_level === 'Critical').length;
  const avgQuality = shipments.length ? (shipments.reduce((a, s) => a + s.quality_remaining, 0) / shipments.length).toFixed(1) : 0;
  const totalRisk = shipments.reduce((a, s) => {
    if (s.risk_index >= 1) return a + (s.qty_kg || 500) * (s.value_per_kg || 200) * (1 - s.quality_remaining / 100);
    return a;
  }, 0);

  const handleAddShipment = (ship) => {
    addShipment(ship);
    setSelectedId(ship.id);
    setShowAdd(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo-block">
          <div className="logo">INTELLI<span className="logo-accent">COLD</span></div>
          <div className="logo-sub">PERISHABLE GOODS COLD CHAIN INTELLIGENCE</div>
        </div>

        <nav className="tab-nav">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="header-right">
          {/* Simple Theme Toggle */}
          <button 
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '20px',
              cursor: 'pointer',
              marginRight: '12px',
              transition: 'all 0.3s'
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className={`live-pill ${online ? 'online' : 'offline'}`}>
            <span className="live-dot" />
            {online ? 'LIVE' : 'DEMO'}
          </div>
          <Clock />
          {lastUpdate && <span className="last-upd">Updated {lastUpdate.toLocaleTimeString()}</span>}
        </div>
      </header>

      {!online && (
        <div className="offline-bar">
          ⚠ Backend offline — demo data shown. Start <code>python app.py</code> to connect.
        </div>
      )}

      <div className="summary-strip">
        {[
          { label: 'Active Shipments',  value: shipments.length, sub: 'Perishables monitored', color: 'var(--accent)' },
          { label: 'Critical Alerts', value: criticalCount, sub: 'Require immediate action', color: 'var(--critical)' },
          { label: 'Fleet Avg Quality', value: avgQuality + '%', sub: 'Across all cargo', color: 'var(--safe)' },
          { label: 'Financial Risk', value: '₹' + Math.round(totalRisk / 1000) + 'K', sub: 'Projected spoilage loss', color: 'var(--medium)' },
          { label: 'Total Cargo', value: shipments.reduce((a,s)=>a+(s.qty_kg||500),0).toLocaleString() + ' kg', sub: 'Across fleet', color: 'var(--high)' },
        ].map((c, i) => (
          <div className="scard" key={i} style={{ '--card-accent': c.color }}>
            <div className="scard-label">{c.label}</div>
            <div className="scard-val" style={{ color: c.color }}>{loading ? '—' : c.value}</div>
            <div className="scard-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <main className="main-content">
        {tab === 'dashboard' && (
          <Dashboard
            shipments={shipments}
            selected={selected}
            onSelect={setSelectedId}
            onSpike={injectSpike}
            onAdd={() => setShowAdd(true)}
            onRemove={removeShipment}
          />
        )}
        {tab === 'route' && (
          <RouteOptimizer shipments={shipments} defaultShipId={selectedId} />
        )}
        {tab === 'quantity' && (
          <QuantityManager shipments={shipments} onUpdate={updateQty} onAdd={() => setShowAdd(true)} />
        )}
        {tab === 'financial' && (
          <Financial shipments={shipments} />
        )}
      </main>

      {showAdd && (
        <AddShipmentModal
          onAdd={handleAddShipment}
          onClose={() => setShowAdd(false)}
          existingCount={shipments.length}
        />
      )}

      {/* Voice Assistant Bot */}
      <VoiceAssistant shipments={shipments} />
    </div>
  );
}