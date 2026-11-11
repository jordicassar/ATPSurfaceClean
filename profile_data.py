# Read-only profiling of atp_tennis.csv (Phases 1-2). Changes nothing.
import pandas as pd

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)

print("=" * 60)
print("PHASE 1: Profile")
print("=" * 60)

# Load the data and check its shape
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

# Numeric summary
print()
print(df.describe())

print()
print("=" * 60)
print("PHASE 2: Discrepancies")
print("=" * 60)

# Whitespace: count leading/trailing spaces in text columns
text_cols = [
    "Tournament", "Series", "Court", 
    "Surface", "Round", "Player_1", "Player_2", "Winner", "Score"
]

print()
print("Rows with leading/trailing whitespace:")
for col in text_cols:
    n = (df[col] != df[col].str.strip()).sum()
    print(f"  {col}: {n}")

bad = df.loc[df["Player_1"] != df["Player_1"].str.strip(), "Player_1"]
print([repr(x) for x in bad.head()])

# Look-alike names: unique players before vs after stripping
all_names = pd.concat([df["Player_1"], df["Player_2"]])
print()
print("Unique player names (raw):       ", all_names.nunique())
print("Unique player names (stripped):", all_names.str.strip().nunique())

# Count surnames shared by 2+ names (uncomment the print below to list them)
names = pd.DataFrame({"name": all_names.str.strip().unique()})
names["surname"] = names["name"].str.rsplit(" ", n=1).str[0]

per_surname = names.groupby("surname")["name"].nunique()
shared = per_surname[per_surname > 1]
print("Surnames shared by 2+ names:", len(shared))
# print(names[names["surname"].isin(shared.index)].sort_values("surname").to_string())

# Year range per spelling, for 10 hand-picked surnames
stacked = pd.DataFrame({
    "name": all_names.str.strip(),
    "year": pd.concat([df["Date"], df["Date"]]).dt.year,
})
check = [
    "Herbert", "Struff", "Stebe", "Kohlschreiber", "Del Potro",
    "Huesler", "Kwon", "Moroni", "Galan", "Granollers"
]

mask = stacked["name"].str.startswith(tuple(check))
print()
print(stacked[mask].groupby("name")["year"].agg(["count", "min", "max"]).to_string())

# Names that collide once punctuation, spaces and case are ignored
def name_key(s):
    return s.lower().replace(".", "").replace("-", "").replace(" ", "")

names["key"] = names["name"].map(name_key)
collide = names.groupby("key")["name"].nunique()
collide = collide[collide > 1]
print()
print("Names that differ only by punctuation/spacing:", len(collide))
print(names[names["key"].isin(collide.index)].sort_values("key")[["key", "name"]].to_string())

# Which collision variants appear in 2015-2026
coll_names = names.loc[names["key"].isin(collide.index), "name"]
recent = stacked[stacked["year"] >= 2015]
print()
print(recent[recent["name"].isin(coll_names)].groupby("name")["year"].agg(["count", "min", "max"]).to_string())

# Sentinel values (-1)
num_cols = ["Rank_1", "Rank_2", "Pts_1", "Pts_2", "Odd_1", "Odd_2"]

print()
print("Rows with -1 per column:")
print((df[num_cols] == -1).sum())

print()
print("Rows with -1, by year (2015+):")
year = df["Date"].dt.year
print((df[num_cols] == -1).groupby(year).sum().loc[2015:])

# Score direction: does Player_1's set count agree with Winner?
def p1_won_by_score(score):
    p1_sets = p2_sets = 0
    for s in score.strip().split():
        a, b = s.split("-")
        if int(a) > int(b):
            p1_sets += 1
        else:
            p2_sets += 1
    return p1_sets > p2_sets

p1_by_score = df["Score"].map(p1_won_by_score)
p1_by_winner = df["Winner"].str.strip() == df["Player_1"].str.strip()

print()
print("Score agrees with Winner:    ", (p1_by_score == p1_by_winner).sum())
print("Score disagrees with Winner:", (p1_by_score != p1_by_winner).sum())

mismatch = df[p1_by_score != p1_by_winner]
print(mismatch[["Date", "Tournament", "Best of", "Player_1", "Player_2", "Winner", "Score"]].to_string())

# Retirements: is the score complete?
def set_finished(a, b):
    hi, lo = max(a, b), min(a, b)
    # 13-12: Wimbledon final-set tiebreak at 12-12 (2019-2021)
    return (hi >= 6 and hi - lo >= 2) or (hi == 7 and lo in (5, 6)) or (hi == 13 and lo == 12)

def is_complete(score, best_of):
    needed = best_of // 2 + 1
    p1 = p2 = 0
    for s in score.strip().split():
        a, b = (int(x) for x in s.split("-"))
        if set_finished(a, b):
            if a > b:
                p1 += 1
            else:
                p2 += 1
    return max(p1, p2) == needed

# Grand Slams forced to best of 5: 23 rows are wrongly labelled best-of-3
df["Complete"] = [is_complete(s, 5 if ser == "Grand Slam" else b) for s, b, ser in zip(df["Score"], df["Best of"], df["Series"])]

print()
print("Incomplete scores (all years):", (~df["Complete"]).sum())
print("Incomplete scores (2015-2025):", (~df["Complete"] & year.between(2015, 2025)).sum())
print(df[~df["Complete"] & (year >= 2015)][["Date", "Tournament", "Best of", "Player_1", "Player_2", "Winner", "Score"]].to_string())

# Grand Slam rows labelled best-of-3
gs3 = (df["Series"] == "Grand Slam") & (df["Best of"] == 3)
print()
print("Grand Slam rows labelled best-of-3:", gs3.sum())
print(gs3.groupby(year).sum().loc[lambda s: s > 0].to_string())

# Duplicates (key: Date, Tournament, Round, Player_1, Player_2)
key_cols = ["Date", "Tournament", "Round", "Player_1", "Player_2"]
k = df[key_cols].copy()
for col in ["Tournament", "Round", "Player_1", "Player_2"]:
    k[col] = k[col].str.strip()

print()
print("Duplicate matches (same order):  ", k.duplicated().sum())

# Same match entered with the players swapped: sort each pair alphabetically
swap = k["Player_1"] > k["Player_2"]
k.loc[swap, ["Player_1", "Player_2"]] = k.loc[swap, ["Player_2", "Player_1"]].to_numpy()
print("Duplicate matches (either order):", k.duplicated().sum())

dups = k.duplicated(keep=False)
if dups.any():
    print(df[dups][["Date", "Tournament", "Round", "Player_1", "Player_2", "Winner", "Score"]].to_string())

# Winner must be Player_1 or Player_2
p1 = df["Player_1"].str.strip()
p2 = df["Player_2"].str.strip()
w = df["Winner"].str.strip()
bad_winner = (w != p1) & (w != p2)
print()
print("Winner not one of the two players:", bad_winner.sum())
if bad_winner.any():
    print(df[bad_winner][["Date", "Tournament", "Player_1", "Player_2", "Winner"]].to_string())

# Carpet in the analysis window
carpet = df["Surface"] == "Carpet"
print()
print("Carpet matches by year (last 5 years with carpet):")
print(carpet.groupby(year).sum().loc[lambda s: s > 0].tail().to_string())
print("Carpet matches in 2015-2026:", (carpet & (year >= 2015)).sum())

# Seasons with unusual match counts (2015-2026)
per_year = year.value_counts().sort_index().loc[2015:]
median = per_year.loc[2015:2025].median()
print()
print("Matches per year vs 2015-2025 median (", median, "):")
print((per_year / median).round(2).to_string())