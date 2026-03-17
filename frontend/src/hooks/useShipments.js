import { useState, useEffect, useCallback, useRef } from 'react';
import { DEMO_SHIPMENTS } from '../data/constants';

const API = 'http://localhost:5000/api';

export function useShipments() {
  const [shipments,   setShipments]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [online,      setOnline]      = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const qtyOverrides = useRef({});

  const applyOverrides = useCallback((data) => {
    return data.map(s => ({
      ...s,
      qty_kg:       qtyOverrides.current[s.id]?.qty_kg       ?? s.qty_kg       ?? 500,
      value_per_kg: qtyOverrides.current[s.id]?.value_per_kg ?? s.value_per_kg ?? 200,
    }));
  }, []);

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/shipments`, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      setShipments(applyOverrides(data));
      setOnline(true);
      setLastUpdate(new Date());
    } catch {
      setOnline(false);
      
      setShipments(prev => {
        // If we have NO local shipments, initialize with the DEMO data
        if (prev.length === 0) {
          return applyOverrides(DEMO_SHIPMENTS);
        }
        
        // Otherwise, EVOLVE the existing local state so user-added entries aren't deleted
        return prev.map(s => {
          let updatedS = { ...s };
          if (s.features) {
            updatedS.features = {
              ...s.features,
              avg_temp_c: +(s.features.avg_temp_c + (Math.random() * 0.35 - 0.1)).toFixed(2),
              transport_duration_hr: +(s.features.transport_duration_hr + +((5 / 3600).toFixed(4))).toFixed(2),
            };
          }
          return updatedS;
        });
      });
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, [online, applyOverrides]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 5000);
    return () => clearInterval(id);
  }, [fetch_]);

  const updateQty = useCallback((shipId, qty, val) => {
    qtyOverrides.current[shipId] = { qty_kg: qty, value_per_kg: val };
    setShipments(prev =>
      prev.map(s => s.id === shipId ? { ...s, qty_kg: qty, value_per_kg: val } : s)
    );
  }, []);

  const addShipment = useCallback(async (ship) => {
    setShipments(prev => [...prev, ship]);
    try {
      await fetch(`${API}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ship.id,
          name: ship.name,
          origin: ship.origin,
          destination: ship.destination,
          distance_km: ship.distance_km,
          product_type: ship.product_type,
          vehicle_type: ship.vehicle_type,
          qty_kg: ship.qty_kg,
          value_per_kg: ship.value_per_kg,
          features: ship.features
        })
      });
      fetch_();
    } catch (e) {
      console.error('Failed to add shipment to backend', e);
    }
  }, [fetch_]);

  const removeShipment = useCallback((id) => {
    setShipments(prev => prev.filter(s => s.id !== id));
  }, []);

  const injectSpike = useCallback(async (shipId) => {
    try {
      await fetch(`${API}/simulate/spike/${shipId}`, { method: 'POST' });
      setTimeout(fetch_, 600);
    } catch {
      setShipments(prev => prev.map(s => {
        if (s.id !== shipId) return s;
        const newRisk = Math.min(3, s.risk_index + 1);
        return {
          ...s,
          quality_remaining: Math.max(0,  s.quality_remaining  - 18),
          hours_to_spoilage: Math.max(0,  s.hours_to_spoilage  - 6),
          risk_index:  newRisk,
          risk_level:  ['Low', 'Medium', 'High', 'Critical'][newRisk],
          features: s.features ? {
            ...s.features,
            avg_temp_c:               s.features.avg_temp_c               + 6.5,
            cumulative_damage_index:  s.features.cumulative_damage_index  + 1.4,
            temp_deviation_degree_hr: s.features.temp_deviation_degree_hr + 32,
          } : s.features,
        };
      }));
    }
  }, [fetch_]);

  return {
    shipments, loading, online, lastUpdate,
    updateQty, addShipment, removeShipment, injectSpike,
  };
}