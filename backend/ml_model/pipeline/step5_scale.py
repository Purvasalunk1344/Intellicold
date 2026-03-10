import pickle
import pandas as pd
from sklearn.preprocessing import StandardScaler

print("=======================================================")
print("   INTELLICOLD — STEP 5: SCALING")
print("=======================================================")

with open("data/splits.pkl", "rb") as f:
    X_train, X_test, y_train, y_test = pickle.load(f)

print("X_train shape:", X_train.shape)
print("X_test shape:", X_test.shape)

# Drop non-numeric columns
drop_cols = [
    "shipment_id",
    "product_name",
    "category"
]

X_train = X_train.drop(columns=drop_cols, errors="ignore")
X_test = X_test.drop(columns=drop_cols, errors="ignore")

# Columns NOT to scale
skip_cols = [
    "temp_danger_flag",
    "category_encoded",
    "product_name_encoded"
]

scale_cols = [c for c in X_train.columns if c not in skip_cols]

print("\nScaling", len(scale_cols), "columns")
print("Skipping:", skip_cols)

scaler = StandardScaler()

X_train[scale_cols] = scaler.fit_transform(X_train[scale_cols])
X_test[scale_cols] = scaler.transform(X_test[scale_cols])

# Save scaled splits
with open("data/scaled_splits.pkl", "wb") as f:
    pickle.dump((X_train, X_test, y_train, y_test), f)

# Save scaler
with open("models/scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

print("\nScaler saved → models/scaler.pkl")
print("Saved data/scaled_splits.pkl")
print("✅ Step 5 complete!")