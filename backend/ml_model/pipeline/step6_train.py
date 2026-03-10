import pickle
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, r2_score
from sklearn.model_selection import train_test_split

print("=======================================================")
print("   INTELLICOLD — STEP 6: TRAINING ALL MODELS")
print("=======================================================")

# Load engineered dataset
df = pd.read_csv("data/features_dataset.csv")

# Clean column names (important if dataset had formatting issues)
df.columns = df.columns.str.strip()

# ----------------------------
# Define Targets
# ----------------------------

y_risk = df["risk_category"]
y_action = df["recommended_action"]
y_quality = (1 - df["spoilage_probability"]) * 100
y_time = df["remaining_shelf_life_hours"]

# ----------------------------
# Define Feature Matrix
# ----------------------------

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

print("Feature columns used for training:")
print(X.columns.tolist())

# ----------------------------
# Train/Test Split
# ----------------------------

X_train, X_test, y_risk_train, y_risk_test = train_test_split(
    X, y_risk, test_size=0.2, random_state=42
)

_, _, y_quality_train, y_quality_test = train_test_split(
    X, y_quality, test_size=0.2, random_state=42
)

_, _, y_time_train, y_time_test = train_test_split(
    X, y_time, test_size=0.2, random_state=42
)

_, _, y_action_train, y_action_test = train_test_split(
    X, y_action, test_size=0.2, random_state=42
)

# ----------------------------
# 1️⃣ Risk Model
# ----------------------------

print("\nTraining Risk Model...")

risk_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    random_state=42,
    n_jobs=-1
)

risk_model.fit(X_train, y_risk_train)

risk_pred = risk_model.predict(X_test)

risk_acc = accuracy_score(y_risk_test, risk_pred)

print("Risk Accuracy:", round(risk_acc * 100, 2), "%")

# ----------------------------
# 2️⃣ Quality Model
# ----------------------------

print("\nTraining Quality Model...")

quality_model = RandomForestRegressor(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)

quality_model.fit(X_train, y_quality_train)

quality_pred = quality_model.predict(X_test)

quality_r2 = r2_score(y_quality_test, quality_pred)

print("Quality R2:", round(quality_r2, 3))

# ----------------------------
# 3️⃣ Shelf Life Model
# ----------------------------

print("\nTraining Shelf Life Model...")

time_model = RandomForestRegressor(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)

time_model.fit(X_train, y_time_train)

time_pred = time_model.predict(X_test)

time_r2 = r2_score(y_time_test, time_pred)

print("Shelf Life R2:", round(time_r2, 3))

# ----------------------------
# 4️⃣ Action Model
# ----------------------------

print("\nTraining Action Model...")

action_model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)

action_model.fit(X_train, y_action_train)

action_pred = action_model.predict(X_test)

action_acc = accuracy_score(y_action_test, action_pred)

print("Action Accuracy:", round(action_acc * 100, 2), "%")

# ----------------------------
# Save Models
# ----------------------------

pickle.dump(risk_model, open("models/risk_model.pkl", "wb"))
pickle.dump(quality_model, open("models/quality_model.pkl", "wb"))
pickle.dump(time_model, open("models/time_model.pkl", "wb"))
pickle.dump(action_model, open("models/action_model.pkl", "wb"))

print("\nModels saved:")
print("• models/risk_model.pkl")
print("• models/quality_model.pkl")
print("• models/time_model.pkl")
print("• models/action_model.pkl")

print("\n=======================================================")
print("Step 6 complete!")