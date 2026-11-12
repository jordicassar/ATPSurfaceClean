# clean atp_tennis.csv. Every step is logged to docs/cleaning_log.csv
import pandas as pd

df = pd.read_csv("data/raw/atp_tennis.csv")
df["Date"] = pd.to_datetime(df["Date"])

log = []

def add_log(step, rows_before, values_changed):
    log.append({
        "step": step,
        "rows_before": rows_before,
        "rows_after": len(df),
        "values_changed": int(values_changed),
    })

# Strip leading/trailing whitespace from text columns
text_cols = [
    "Tournament", "Series", "Court", "Surface", 
    "Round", "Player_1", "Player_2", "Winner", "Score"
]

rows = len(df)
changed = 0
for col in text_cols:
    changed += (df[col] != df[col].str.strip()).sum()
    df[col] = df[col].str.strip()
add_log("Strip whitespace", rows, changed)

# Merge name variants (explicit, checked by hand in Phase 2)
name_map = {
    "Carreno-Busta P.":"Carreno Busta P.",
    "Mcdonald M.": "McDonald M.",
    "Mccabe J.": "McCabe J.",
    "Herbert P.H": "Herbert P.H.",
    "Herbert P-H.":"Herbert P.H.",
    "Herbert P.": "Herbert P.H.",
    "Varillas J. P.": "Varillas J.P.",
    "Tseng C. H.": "Tseng C.H.",
    "Del Potro J. M.": "Del Potro J.M.",
    "Tirante T. A.": "Tirante T.A.",
    "Hernandez-Fernandez J": "Hernandez-Fernandez J.",
    "Aragone JC": "Aragone J.C.",
    "Zayid M. S.": "Zayid M.S.",
    "Zhang Ze.": "Zhang Ze",
    "Munoz-De La Nava D.": "Munoz De La Nava D.",
    "Galan D.": "Galan D.E.",
    "Kwon S.": "Kwon S.W.",
    "Huesler M.": "Huesler M.A.",
}
rows = len(df)
changed = 0
for col in ["Player_1", "Player_2", "Winner"]:
    changed += df[col].isin(name_map.keys()).sum()
    df[col] = df[col].replace(name_map)
add_log("Merge name variants", rows, changed)

# Keep 2015-2026 (2015-2025 analysis, 2026 holdout)
rows = len(df)
df = df[df["Date"].dt.year >= 2015].copy()
add_log("Filter to 2015-2026", rows, 0)

# Replace -1 (missing) with blank
num_cols = ["Rank_1", "Rank_2", "Pts_1", "Pts_2", "Odd_1", "Odd_2"]
rows = len(df)
missing = df[num_cols] == -1
df[num_cols] = df[num_cols].mask(missing)
add_log("Replace -1 with blank", rows, missing.sum().sum())

# Grand Slams are best of 5
rows = len(df)
wrong_bo = (df["Series"] == "Grand Slam") & (df["Best of"] == 3)
df.loc[wrong_bo, "Best of"] = 5
add_log("Grand Slam Best of = 5", rows, wrong_bo.sum())

# Drop duplicates and invalid winners (expect: 0)
rows = len(df)
df = df.drop_duplicates(subset=["Date", "Tournament", "Round", "Player_1", "Player_2"])
add_log("Drop duplicates", rows, rows - len(df))

rows = len(df)
valid_winner = (df["Winner"] == df["Player_1"]) | (df["Winner"] == df["Player_2"])
df = df[valid_winner].copy()
add_log("Drop invalid winners", rows, rows - len(df))

# Score checks: Retired & Score_Error
def set_finished(a, b):
    hi, lo = max(a, b), min(a, b)
    return (hi >= 6 and hi - lo >= 2) or (hi == 7 and lo in (5, 6)) or (hi == 13 and lo == 12)
def set_possible(a, b):
    hi, lo = max(a, b), min(a, b)
    if hi <= 6:
        return True
    if hi <= 7:
        return lo in (5, 6)
    return hi - lo == 2 or (hi == 13 and lo == 12)

def check_score(score, best_of, p1_is_winner):
    needed = best_of // 2 + 1
    p1 = p2 = 0
    possible = True
    sets = score.split()
    for i, s in enumerate(sets):
        a, b = (int(x) for x in s.split("-"))
        if not set_possible(a, b):
            possible = False
        if not set_finished(a, b) and i < len(sets) - 1:
            possible = False     # an unfinished set before the last one
        if set_finished(a, b):
            if a > b:
                p1 += 1
            else:
                p2 += 1
    complete = max(p1, p2) == needed
    too_many_sets = max(p1, p2) > needed
    wrong_winner = complete and ((p1 > p2) != p1_is_winner)
    score_error = (not possible) or too_many_sets or wrong_winner
    retired = (not complete) and (not score_error)
    return retired, score_error

p1_is_winner = df["Winner"] == df["Player_1"]
results = [check_score(s, b, w) for s, b, w in zip(df["Score"], df["Best of"], p1_is_winner)]
df["Retired"] = [int(r) for r, e in results]
df["Score_Error"] = [int(e) for r, e in results]

rows = len(df)
add_log("Flag Retired", rows, df["Retired"].sum())
add_log("Flag Score_Error", rows, df["Score_Error"].sum())

# Checkpoint (2015-2025): 4 Retired + 4 Score_Error
year = df["Date"].dt.year
in_window = year <= 2025
print("Retired (2015-2025):    ", df.loc[in_window, "Retired"].sum())
print("Score_Error (2015-2025):", df.loc[in_window, "Score_Error"].sum())
print("Score_Error (2026):      ", df.loc[~in_window, "Score_Error"].sum())
flagged = (df["Retired"] == 1) | (df["Score_Error"] == 1)
print(df[flagged][["Date", "Tournament", "Player_1" ,"Player_2", "Winner", "Score", "Retired", "Score_Error"]].to_string())

# Save the cleaning log
log_df = pd.DataFrame(log)
print()
print(log_df.to_string(index=False))
log_df.to_csv("docs/cleaning_log.csv", index=False)

analysis = df[df["Date"].dt.year <= 2025]

# One row per player per match: stack Player_1 and Player_2
p1 = analysis[["Player_1", "Surface"]].rename(columns={"Player_1": "Player"})
p2 = analysis[["Player_2", "Surface"]].rename(columns={"Player_2": "Player"})
appearances = pd.concat([p1, p2])

# Matches per player per surface, surfaces as columns
counts = appearances.groupby(["Player", "Surface"]).size().unstack(fill_value=0)
counts = counts[["Hard", "Clay", "Grass"]]
counts["Total"] = counts.sum(axis=1)

# How the cutoff changes the group size (for the README tradeoff)
print()
print("Players in 2015-2025:", len(counts))
for n in [20, 30, 40]:
    print(f" Cutoff {n}:", (counts[["Hard", "Clay", "Grass"]].min(axis=1) >= n).sum(), "players")

MIN_MATCHES = 20
selected = counts[counts[["Hard", "Clay", "Grass"]].min(axis=1) >= MIN_MATCHES]
selected = selected.sort_values("Total", ascending=False).reset_index()

print("Selected players:", len(selected))
print(selected.head(10).to_string(index=False))
selected.to_csv("data/clean/selected_players.csv", index=False)

# One row per player match
def flip_score(score):
    # "6-3 4-6" -> "3-6 6-4"
    return " ".join("-".join(reversed(s.split("-"))) for s in score.split())

shared = ["Date", "Tournament", "Series", "Court", "Surface", "Round", "Best of", "Winner", "Retired", "Score_Error"]

# Player_1s point of view
a = df[shared].copy()
a["Player"] = df["Player_1"]
a["Opponent"] = df["Player_2"]
a["Rank"] = df["Rank_1"]
a["Opp_Rank"] = df["Rank_2"]
a["Pts"] = df["Pts_1"]
a["Opp_Pts"] = df["Pts_2"]
a["Odd"] = df["Odd_1"]
a["Opp_Odd"] = df["Odd_2"]
a["Score"] = df["Score"]

# Player_2s point of view (everything swapped, score flipped)
b = df[shared].copy()
b["Player"] = df["Player_2"]
b["Opponent"] = df["Player_1"]
b["Rank"] = df["Rank_2"]
b["Opp_Rank"] = df["Rank_1"]
b["Pts"] = df["Pts_2"]
b["Opp_Pts"] = df["Pts_1"]
b["Odd"] = df["Odd_2"]
b["Opp_Odd"] = df["Odd_1"]
b["Score"] = df["Score"].map(flip_score)

# Stack, keep the 100 selected players
pm = pd.concat([a, b], ignore_index=True)
pm = pm[pm["Player"].isin(selected["Player"])].copy()

# New columns
pm["Won"] = (pm["Player"] == pm["Winner"]).astype(int)
pm["Implied_Win_Prob"] = (1 / pm["Odd"]) / (1 / pm["Odd"] + 1 / pm["Opp_Odd"])
pm["Odds_Missing"] = (pm["Odd"].isna() | pm["Opp_Odd"].isna()).astype(int)
pm["Split"] = (pm["Date"].dt.year <= 2025).map({True: "analysis", False: "holdout"})
pm = pm.drop(columns="Winner").sort_values(["Player", "Date"]).reset_index(drop=True)

# for every non-flagged row, the score agrees with Won
def won_by_score(score):
    mine = theirs = 0
    for s in score.split():
        x, y = (int(v) for v in s.split("-"))
        if x > y:
            mine += 1
        else:
            theirs += 1
    return int(mine > theirs)

check = pm[(pm["Retired"] == 0) & (pm["Score_Error"] == 0)]
mismatch = check["Score"].map(won_by_score) != check["Won"]
print()
print("Player-match rows:", len(pm), "| players:", pm["Player"].nunique())
print(pm["Split"].value_counts().to_string())
print("Score vs Won mismatches:", mismatch.sum())
print("Odds_Missing rows:", pm["Odds_Missing"].sum())

# Export
pm.to_csv("data/clean/player_matches.csv", index=False)
print("Saved data/clean/player_matches.csv", len(pm), "rows")
