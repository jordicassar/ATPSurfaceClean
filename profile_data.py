# Load the data and check its shape
import pandas as pd

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)

df = pd.read_csv("data/raw/atp_tennis.csv")

print("Shape:", df.shape)
print()
print(df.dtypes)
print()
print(df.head())

# Count nulls
print()
print("Null counts:")
print(df.isna().sum())

# Count categorical values
for col in ["Surface", "Court", "Series", "Round", "Best of"]:
    print()
    print(df[col].value_counts())

# Dates and matches per year
df["Date"] = pd.to_datetime(df["Date"])
print()
print("Date range:", df["Date"].min(), "to", df["Date"].max())
print()
print(df["Date"].dt.year.value_counts().sort_index())

# Numeric Summary
print()
print(df.describe())