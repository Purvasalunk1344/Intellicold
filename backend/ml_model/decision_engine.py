"""
IntelliCold — Decision Engine
"""

def get_actions(prediction: dict, distance_km: float) -> list:
    risk    = prediction['risk_index']
    quality = prediction['quality_remaining']
    hours   = prediction['hours_to_spoilage']
    actions = []

    if risk >= 3:
        actions.append("🚨 CRITICAL: Increase cooling to maximum immediately")
        actions.append("📞 Alert logistics manager and recipient now")
        actions.append("🚚 Re-route to nearest depot for emergency inspection")
    elif risk == 2:
        actions.append("⚠️ HIGH RISK: Increase cooling intensity by 20%")
        actions.append("📊 Schedule quality inspection at next checkpoint")
        if hours < distance_km / 60:
            actions.append("🚀 Prioritize express delivery — may not survive standard route")
    elif risk == 1:
        actions.append("🔶 MEDIUM: Monitor temperature every 15 minutes")
        actions.append("📝 Log shipment for quality review on arrival")
    else:
        actions.append("✅ SAFE: Conditions nominal — maintain current cooling")

    return actions


def prioritize_shipments(shipments: list) -> list:
    def score(s):
        return (
            s['risk_index'] * 40
            + (100 - s['quality_remaining']) * 0.3
            + max(0, 10 - s['hours_to_spoilage']) * 5
            - s['distance_km'] / 100
        )
    return sorted(shipments, key=score, reverse=True)