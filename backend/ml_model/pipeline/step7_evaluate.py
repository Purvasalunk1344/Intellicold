import pickle
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report

print("=======================================================")
print("   INTELLICOLD — STEP 7: MODEL EVALUATION")
print("=======================================================")

# Load dataset
df = pd.read_csv("data/features_dataset.csv")

# Clean column names
df.columns = df.columns.str.strip()

# Target
y = df["risk_category"]

# Remove target + non-feature columns
X = df.drop(columns=[
    "shipment_id",
    "product_name",
    "category",
    "risk_category",
    "recommended_action",
    "spoilage_probability",
    "remaining_shelf_life_hours",
    "risk_encoded",
    "action_encoded"
], errors="ignore")

print("Test data shape:", X.shape)

# Load model
model = pickle.load(open("models/risk_model.pkl", "rb"))

print("\nLoaded trained model")

# Predict
pred = model.predict(X)

# Accuracy
acc = accuracy_score(y, pred)

print("\nAccuracy:", round(acc * 100, 2), "%")

print("\nClassification Report:")
print(classification_report(y, pred))

print("\n=======================================================")
print("Step 7 complete!")