import pandas as pd
from sklearn.preprocessing import LabelEncoder

print("=================================================")
print(" INTELLICOLD — STEP 2: PREPROCESSING")
print("=================================================")

df = pd.read_csv("data/final_dataset.csv")

# Label encoders
cat_enc = LabelEncoder()
prod_enc = LabelEncoder()
risk_enc = LabelEncoder()
action_enc = LabelEncoder()

df["category_encoded"] = cat_enc.fit_transform(df["category"])
df["product_name_encoded"] = prod_enc.fit_transform(df["product_name"])
df["risk_encoded"] = risk_enc.fit_transform(df["risk_category"])
df["action_encoded"] = action_enc.fit_transform(df["recommended_action"])

print("\nCategory mapping:", dict(zip(cat_enc.classes_, cat_enc.transform(cat_enc.classes_))))
print("Risk mapping:", dict(zip(risk_enc.classes_, risk_enc.transform(risk_enc.classes_))))
print("Action mapping:", dict(zip(action_enc.classes_, action_enc.transform(action_enc.classes_))))

df.to_csv("data/processed_dataset.csv", index=False)

print("\nSaved → data/processed_dataset.csv")
print("Step 2 complete")