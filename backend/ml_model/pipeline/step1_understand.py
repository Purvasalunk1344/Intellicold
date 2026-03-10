import pandas as pd

print("=================================================")
print(" INTELLICOLD — STEP 1: DATA UNDERSTANDING")
print("=================================================")

df = pd.read_csv("data/final_dataset.csv")

print("\nShape:", df.shape)

print("\nColumns:")
print(df.columns)

print("\nMissing Values:")
print(df.isnull().sum())

print("\nRisk Distribution:")
print(df["risk_category"].value_counts())

print("\nDataset preview:")
print(df.head())

print("\nStep 1 completed")