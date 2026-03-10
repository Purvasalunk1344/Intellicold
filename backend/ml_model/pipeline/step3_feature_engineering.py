import pandas as pd

print("=================================================")
print(" INTELLICOLD — STEP 3: FEATURE ENGINEERING")
print("=================================================")

df = pd.read_csv("data/processed_dataset.csv")

df["temp_deviation"] = df["temperature_C"] - df["safe_temp_mid_C"]

df["temp_deviation_degree_hr"] = df["temp_deviation"] * df["exposure_hours"]

df["humidity_deviation"] = df["humidity_percent"] - df["humidity_mid_percent"]

df["temp_danger_flag"] = (df["temperature_C"] > df["safe_temp_high_C"]).astype(int)

# cumulative damage index
df["cumulative_damage_index"] = abs(df["temp_deviation_degree_hr"]) / 100

df.to_csv("data/features_dataset.csv", index=False)

print("Saved → data/features_dataset.csv")
print("Step 3 complete")