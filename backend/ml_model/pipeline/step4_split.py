import pandas as pd
import pickle
from sklearn.model_selection import train_test_split

print("=================================================")
print(" INTELLICOLD — STEP 4: SPLIT")
print("=================================================")

df = pd.read_csv("data/features_dataset.csv")

print("Loaded shape:", df.shape)

# Targets
y_risk = df["risk_category"]

# Features
X = df.drop(columns=["risk_category","recommended_action"], errors="ignore")

X_train, X_test, y_train, y_test = train_test_split(
    X, y_risk,
    test_size=0.2,
    random_state=42,
    stratify=y_risk
)

print("\nTrain:", X_train.shape, "| Test:", X_test.shape)

pickle.dump(
    (X_train, X_test, y_train, y_test),
    open("data/splits.pkl", "wb")
)

print("\nSaved data/splits.pkl")
print("Step 4 complete!")