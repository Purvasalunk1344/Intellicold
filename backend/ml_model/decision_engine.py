# """
# IntelliCold — Decision Engine
# """

# def get_actions(prediction: dict, distance_km: float) -> list:
#     risk    = prediction['risk_index']
#     quality = prediction['quality_remaining']
#     hours   = prediction['hours_to_spoilage']
#     actions = []

#     if risk >= 3:
#         actions.append("🚨 CRITICAL: Increase cooling to maximum immediately")
#         actions.append("📞 Alert logistics manager and recipient now")
#         actions.append("🚚 Re-route to nearest depot for emergency inspection")
#     elif risk == 2:
#         actions.append("⚠️ HIGH RISK: Increase cooling intensity by 20%")
#         actions.append("📊 Schedule quality inspection at next checkpoint")
#         if hours < distance_km / 60:
#             actions.append("🚀 Prioritize express delivery — may not survive standard route")
#     elif risk == 1:
#         actions.append("🔶 MEDIUM: Monitor temperature every 15 minutes")
#         actions.append("📝 Log shipment for quality review on arrival")
#     else:
#         actions.append("✅ SAFE: Conditions nominal — maintain current cooling")

#     return actions


# def prioritize_shipments(shipments: list) -> list:
#     def score(s):
#         return (
#             s['risk_index'] * 40
#             + (100 - s['quality_remaining']) * 0.3
#             + max(0, 10 - s['hours_to_spoilage']) * 5
#             - s['distance_km'] / 100
#         )
#     return sorted(shipments, key=score, reverse=True)

"""
IntelliCold - Decision Engine
Provides actionable recommendations based on ML predictions
"""

from typing import Dict, List, Any


def get_actions(prediction: Dict[str, Any], distance_km: float = 0) -> List[Dict[str, str]]:
    """
    Generate actionable recommendations based on prediction
    
    Args:
        prediction: ML prediction dict with risk_level, quality_remaining, hours_to_spoilage
        distance_km: Remaining distance to destination
    
    Returns:
        List of action dictionaries with priority, action text, and type
    """
    
    risk_index = prediction.get('risk_index', 0)
    quality = prediction.get('quality_remaining', 100)
    hours = prediction.get('hours_to_spoilage', 100)
    
    actions = []
    
    # Critical risk actions
    if risk_index >= 3:
        actions.append({
            'priority': 'CRITICAL',
            'action': 'EMERGENCY: Activate cooling backup systems immediately',
            'type': 'cooling'
        })
        actions.append({
            'priority': 'CRITICAL',
            'action': 'Expedite delivery - reroute to nearest facility if needed',
            'type': 'routing'
        })
        actions.append({
            'priority': 'CRITICAL',
            'action': 'Alert quality control team and prepare for inspection',
            'type': 'notification'
        })
    
    # High risk actions
    elif risk_index == 2:
        actions.append({
            'priority': 'HIGH',
            'action': 'Increase cooling intensity by 20%',
            'type': 'cooling'
        })
        actions.append({
            'priority': 'HIGH',
            'action': 'Monitor temperature every 15 minutes',
            'type': 'monitoring'
        })
        if distance_km > 100:
            actions.append({
                'priority': 'HIGH',
                'action': 'Consider alternative faster route',
                'type': 'routing'
            })
    
    # Medium risk actions
    elif risk_index == 1:
        actions.append({
            'priority': 'MEDIUM',
            'action': 'Adjust cooling settings - increase by 10%',
            'type': 'cooling'
        })
        actions.append({
            'priority': 'MEDIUM',
            'action': 'Check sensor calibration',
            'type': 'maintenance'
        })
    
    # Low risk - all good
    else:
        actions.append({
            'priority': 'LOW',
            'action': 'Maintain current cooling settings',
            'type': 'cooling'
        })
        actions.append({
            'priority': 'LOW',
            'action': 'Continue standard monitoring',
            'type': 'monitoring'
        })
    
    # Quality-based actions
    if quality < 50:
        actions.append({
            'priority': 'HIGH',
            'action': 'Quality degrading - prepare for potential rejection at destination',
            'type': 'notification'
        })
    elif quality < 70:
        actions.append({
            'priority': 'MEDIUM',
            'action': 'Document quality concerns for customer notification',
            'type': 'documentation'
        })
    
    # Time-based actions
    if hours < 12:
        actions.append({
            'priority': 'HIGH',
            'action': f'Only {hours:.1f} hours until spoilage - prioritize delivery',
            'type': 'routing'
        })
    
    return actions


def prioritize_shipments(shipments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank shipments by urgency based on risk and time remaining
    
    Args:
        shipments: List of shipment dicts with risk_index, hours_to_spoilage, quality_remaining
    
    Returns:
        Sorted list of shipments (highest priority first)
    """
    
    def priority_score(shipment):
        """Calculate priority score (higher = more urgent)"""
        risk = shipment.get('risk_index', 0)
        hours = shipment.get('hours_to_spoilage', 100)
        quality = shipment.get('quality_remaining', 100)
        distance = shipment.get('distance_km', 0)
        
        # Risk weight: Critical=100, High=75, Medium=50, Low=25
        risk_score = (risk + 1) * 25
        
        # Time urgency: Less time = higher score
        time_score = max(0, 100 - hours) if hours < 100 else 0
        
        # Quality urgency: Lower quality = higher score
        quality_score = 100 - quality
        
        # Distance factor: Longer distance = slightly higher priority
        distance_score = min(distance / 100, 10)
        
        # Weighted total
        total = (
            risk_score * 0.5 +      # 50% weight on risk
            time_score * 0.3 +      # 30% weight on time
            quality_score * 0.15 +  # 15% weight on quality
            distance_score * 0.05   # 5% weight on distance
        )
        
        return total
    
    # Sort by priority score (descending)
    sorted_shipments = sorted(shipments, key=priority_score, reverse=True)
    
    return sorted_shipments