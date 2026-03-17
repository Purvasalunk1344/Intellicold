// Perishable goods only — no vaccines or pharma
export const PRODUCT_CONFIG = {
  apple:     { label:'Apple',     icon:'🍎', safeTemp:2,  shelfDays:30, unit:'kg',     valuePerKg:120, color:'#fff1f0', accent:'#f5222d' },
  banana:    { label:'Banana',    icon:'🍌', safeTemp:14, shelfDays:14, unit:'kg',     valuePerKg:60,  color:'#fffbe6', accent:'#fadb14' },
  butter:    { label:'Butter',    icon:'🧈', safeTemp:4,  shelfDays:90, unit:'kg',     valuePerKg:500, color:'#fffbe6', accent:'#faad14' },
  cabbage:   { label:'Cabbage',   icon:'🥬', safeTemp:0,  shelfDays:21, unit:'kg',     valuePerKg:40,  color:'#f6ffed', accent:'#52c41a' },
  carrot:    { label:'Carrot',    icon:'🥕', safeTemp:0,  shelfDays:30, unit:'kg',     valuePerKg:50,  color:'#fff2e8', accent:'#fa541c' },
  chicken:   { label:'Chicken',   icon:'🍗', safeTemp:2,  shelfDays:5,  unit:'kg',     valuePerKg:250, color:'#fff0f6', accent:'#eb2f96' },
  fish:      { label:'Fish',      icon:'🐟', safeTemp:0,  shelfDays:3,  unit:'kg',     valuePerKg:450, color:'#e6f7ff', accent:'#1890ff' },
  grapes:    { label:'Grapes',    icon:'🍇', safeTemp:0,  shelfDays:14, unit:'kg',     valuePerKg:100, color:'#f9f0ff', accent:'#722ed1' },
  mango:     { label:'Mango',     icon:'🥭', safeTemp:12, shelfDays:14, unit:'kg',     valuePerKg:150, color:'#fff7e6', accent:'#fa8c16' },
  milk:      { label:'Milk',      icon:'🥛', safeTemp:4,  shelfDays:7,  unit:'litres', valuePerKg:55,  color:'#e8f5e9', accent:'#4caf50' },
  mutton:    { label:'Mutton',    icon:'🥩', safeTemp:2,  shelfDays:5,  unit:'kg',     valuePerKg:800, color:'#fff1f0', accent:'#f5222d' },
  onion:     { label:'Onion',     icon:'🧅', safeTemp:10, shelfDays:30, unit:'kg',     valuePerKg:30,  color:'#fff0f6', accent:'#eb2f96' },
  orange:    { label:'Orange',    icon:'🍊', safeTemp:4,  shelfDays:30, unit:'kg',     valuePerKg:80,  color:'#fff7e6', accent:'#fa8c16' },
  paneer:    { label:'Paneer',    icon:'🧀', safeTemp:4,  shelfDays:14, unit:'kg',     valuePerKg:350, color:'#fffbe6', accent:'#faad14' },
  potato:    { label:'Potato',    icon:'🥔', safeTemp:10, shelfDays:60, unit:'kg',     valuePerKg:25,  color:'#ffe0b2', accent:'#ffb300' },
  tomato:    { label:'Tomato',    icon:'🍅', safeTemp:8,  shelfDays:14, unit:'kg',     valuePerKg:40,  color:'#fff1f0', accent:'#f5222d' },
  
  // Legacy placeholders to maintain backward compatibility
  meat:      { label:'Meat',      icon:'🥩', safeTemp:2,  shelfDays:5,  unit:'kg',     valuePerKg:380, color:'#fbe9e7', accent:'#ff5722' },
  seafood:   { label:'Seafood',   icon:'🐟', safeTemp:0,  shelfDays:3,  unit:'kg',     valuePerKg:520, color:'#e3f2fd', accent:'#2196f3' },
  fruit:     { label:'Fruit',     icon:'🍎', safeTemp:8,  shelfDays:10, unit:'kg',     valuePerKg:90,  color:'#fff8e1', accent:'#ffc107' },
  vegetable: { label:'Vegetable', icon:'🥦', safeTemp:5,  shelfDays:8,  unit:'kg',     valuePerKg:45,  color:'#f1f8e9', accent:'#8bc34a' },
  yogurt:    { label:'Yogurt',    icon:'🫙', safeTemp:4,  shelfDays:14, unit:'kg',     valuePerKg:120, color:'#fce4ec', accent:'#e91e63' },
  eggs:      { label:'Eggs',      icon:'🥚', safeTemp:5,  shelfDays:21, unit:'dozen',  valuePerKg:80,  color:'#fff3e0', accent:'#ff9800' },
};

export const VEHICLE_CONFIG = {
  reefer_truck:  { label:'Reefer Truck',  icon:'🚛', riskMult:0.7,  speedKmh:65 },
  insulated_van: { label:'Insulated Van', icon:'🚐', riskMult:0.9,  speedKmh:55 },
  open_truck:    { label:'Open Truck',    icon:'🚚', riskMult:1.35, speedKmh:70 },
};

export const DEMO_SHIPMENTS = [
  {
    id: 'S001',
    name: 'Dairy Run — Amul',
    origin: 'Anand', destination: 'Mumbai',
    distance_km: 430,
    product_type: 'milk', vehicle_type: 'reefer_truck',
    qty_kg: 2400, value_per_kg: 55,
    quality_remaining: 88.5, risk_level: 'Low', risk_index: 0,
    hours_to_spoilage: 52.3, priority_rank: 3,
    actions: [
      '✅ SAFE: Temperature stable at 3.2°C — within safe range',
      '📋 Continue current cooling protocol',
    ],
    features: {
      avg_temp_c: 3.2, humidity_percent: 62,
      temp_deviation_degree_hr: 4.1, cumulative_damage_index: 0.08,
      transport_duration_hr: 6.5, nh3_ppm: 1.2, co2_ppm: 420, h2s_ppm: 0.05, ethylene_ppm: 0.8,
    },
    readings: [],
  },
  {
    id: 'S002',
    name: 'Seafood Batch — Vizag',
    origin: 'Visakhapatnam', destination: 'Hyderabad',
    distance_km: 355,
    product_type: 'seafood', vehicle_type: 'insulated_van',
    qty_kg: 680, value_per_kg: 520,
    quality_remaining: 61.4, risk_level: 'Medium', risk_index: 1,
    hours_to_spoilage: 18.6, priority_rank: 2,
    actions: [
      '🔶 MEDIUM RISK: Temperature rose to 7.1°C — above safe limit (0°C)',
      '❄️ Increase cooling intensity — target -1°C to 2°C',
      '📍 Check ETA — current route may exceed safe window',
    ],
    features: {
      avg_temp_c: 7.1, humidity_percent: 81,
      temp_deviation_degree_hr: 38.2, cumulative_damage_index: 0.52,
      transport_duration_hr: 14.2, nh3_ppm: 5.8, co2_ppm: 580, h2s_ppm: 0.8, ethylene_ppm: 6.2,
    },
    readings: [],
  },
  {
    id: 'S003',
    name: 'Mutton Cargo — Rajasthan',
    origin: 'Jaipur', destination: 'Delhi',
    distance_km: 282,
    product_type: 'meat', vehicle_type: 'open_truck',
    qty_kg: 950, value_per_kg: 380,
    quality_remaining: 23.8, risk_level: 'High', risk_index: 2,
    hours_to_spoilage: 4.2, priority_rank: 1,
    actions: [
      '⚠️ HIGH RISK: Cumulative thermal damage index at 2.9',
      '🚨 Expedite delivery immediately — 4.2h window remaining',
      '📞 Notify recipient for urgent pickup on arrival',
      '🌡️ Max cooling now — reduce compartment to 1°C',
    ],
    features: {
      avg_temp_c: 11.4, humidity_percent: 74,
      temp_deviation_degree_hr: 98.6, cumulative_damage_index: 2.9,
      transport_duration_hr: 28.7, nh3_ppm: 9.2, co2_ppm: 750, h2s_ppm: 1.5, ethylene_ppm: 8.5,
    },
    readings: [],
  },
  {
    id: 'S004',
    name: 'Mixed Produce — Nashik',
    origin: 'Nashik', destination: 'Pune',
    distance_km: 211,
    product_type: 'vegetable', vehicle_type: 'insulated_van',
    qty_kg: 3200, value_per_kg: 45,
    quality_remaining: 79.2, risk_level: 'Low', risk_index: 0,
    hours_to_spoilage: 44.8, priority_rank: 4,
    actions: [
      '✅ SAFE: Ethylene levels normal — no premature ripening detected',
      '💧 Humidity at 83% — maintain current misting schedule',
    ],
    features: {
      avg_temp_c: 6.8, humidity_percent: 83,
      temp_deviation_degree_hr: 8.4, cumulative_damage_index: 0.14,
      transport_duration_hr: 3.2, nh3_ppm: 2.1, co2_ppm: 480, h2s_ppm: 0.1, ethylene_ppm: 2.5,
    },
    readings: [],
  },
  {
    id: 'S005',
    name: 'Alphonso Mangoes',
    origin: 'Ratnagiri', destination: 'Bangalore',
    distance_km: 618,
    product_type: 'fruit', vehicle_type: 'reefer_truck',
    qty_kg: 1800, value_per_kg: 90,
    quality_remaining: 51.6, risk_level: 'Medium', risk_index: 1,
    hours_to_spoilage: 22.1, priority_rank: 2,
    actions: [
      '🔶 MEDIUM: Ethylene spike detected — accelerated ripening risk',
      '🌬️ Increase ventilation to reduce ethylene buildup',
      '🔄 Re-evaluate route — consider direct highway option',
    ],
    features: {
      avg_temp_c: 9.4, humidity_percent: 76,
      temp_deviation_degree_hr: 22.7, cumulative_damage_index: 0.38,
      transport_duration_hr: 19.5, nh3_ppm: 3.4, co2_ppm: 610, h2s_ppm: 0.3, ethylene_ppm: 12.4,
    },
    readings: [],
  },
];

export const INDIAN_CITIES = [
  'Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune',
  'Ahmedabad','Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore',
  'Bhopal','Visakhapatnam','Nashik','Anand','Ratnagiri','Amritsar',
  'Vadodara','Rajkot','Coimbatore','Madurai','Patna','Ranchi','Kochi',
];

export const CITY_GRAPH = {
  'Mumbai':        { 'Pune':148,  'Nashik':166,  'Surat':284,  'Ahmedabad':524, 'Nagpur':833 },
  'Pune':          { 'Mumbai':148,'Nashik':211,  'Hyderabad':560,'Bangalore':836 },
  'Delhi':         { 'Jaipur':282,'Agra':206,    'Lucknow':555,'Chandigarh':248,'Amritsar':450 },
  'Jaipur':        { 'Delhi':282, 'Ahmedabad':658,'Agra':238,  'Jodhpur':334 },
  'Bangalore':     { 'Chennai':346,'Hyderabad':575,'Mysore':145,'Coimbatore':365 },
  'Hyderabad':     { 'Bangalore':575,'Chennai':625,'Nagpur':500,'Mumbai':711 },
  'Visakhapatnam': { 'Hyderabad':355,'Chennai':790,'Kolkata':900 },
  'Nashik':        { 'Mumbai':166,'Pune':211,    'Aurangabad':235,'Surat':296 },
  'Ratnagiri':     { 'Mumbai':330,'Pune':290,    'Bangalore':618 },
  'Anand':         { 'Ahmedabad':72,'Mumbai':430,'Surat':195,  'Vadodara':43 },
};