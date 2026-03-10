import pickle
import os

print("=======================================================")
print("   INTELLICOLD — STEP 8: SAVE FINAL MODEL")
print("=======================================================")

# Ensure models folder exists
os.makedirs("models", exist_ok=True)

# Load trained model
with open("models/risk_model.pkl", "rb") as f:
    model = pickle.load(f)

print("Loaded trained risk model")

# Load scaler
with open("models/scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

print("Loaded scaler")

# Save combined package
final_package = {
    "model": model,
    "scaler": scaler
}

with open("models/intellicold_model_package.pkl", "wb") as f:
    pickle.dump(final_package, f)

print("\nFinal package saved → models/intellicold_model_package.pkl")

print("\nSaved components:")
print("• Trained ML model")
print("• Feature scaler")

print("\nStep 8 complete!")