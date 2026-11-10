# ATPSurfaceClean: Project Plan

## Business question
From a select batch of ATP players over a 10-year span (2015–2025), how does court surface affect their performance, so we can predict future performance for those players on different surfaces?

## Scope
- **Data:** `atp_tennis.csv`, ATP main-tour match results with rankings and bookmaker odds (2000 to Aug 2026)
- **Analysis window:** 2015–2025
- **Holdout:** 2026 partial season, used only to test predictions
- **Players:** 100, chosen by rule (see Phase 4), not by hand
- **Tools:** Python (pandas) for cleaning; Excel for analysis

## Repo structure
```
clean.py                        cleaning script
PLAN.md                         this file
DISCREPANCIES.md                every data issue found and how it was handled
README.md                       question, method, findings, how to run
data/raw/atp_tennis.csv         original file, never edited
data/clean/player_matches.csv   one row per player per match
data/clean/selected_players.csv the 100 players and their match counts per surface
docs/cleaning_log.csv           rows affected by each cleaning rule
excel/analysis.xlsx             Excel analysis
```

---

## Phase 0: Set up
- [ ] Create the repo (Public, Python .gitignore, MIT license)
- [ ] Clone locally and create `data/raw`, `data/clean`, `docs`, `excel`
- [ ] Add `atp_tennis.csv` to `data/raw/`
- [ ] Commit and push

**Done when:** the raw file is visible on GitHub.

## Phase 1: Profile the data
- [ ] Load the CSV with pandas
- [ ] Record shape, column types, and null counts
- [ ] `value_counts()` on `Surface`, `Court`, `Series`, `Round`, `Best of`
- [ ] Convert `Date` to datetime; count matches per year
- [ ] Check min/max of every numeric column

**Checkpoint:** 68,635 rows × 17 columns; dates 2000 to Aug 2026; zero nulls reported (find out why that's misleading).

## Phase 2: Find the discrepancies
Log each issue in `DISCREPANCIES.md` with a row count as you find it.
- [ ] Whitespace: compare each text column to its stripped version
- [ ] Look-alike names: search for players who share a surname
- [ ] Sentinel values: what stands in for "missing" in ranks, points, odds?
- [ ] Score direction: check a match where a known winner is `Player_2`
- [ ] Retirements: no "RET" label; how can an unfinished match be detected?
- [ ] Duplicates (key: Date, Tournament, Round, Player_1, Player_2)
- [ ] Winner not one of the two players
- [ ] Carpet surface in the analysis window
- [ ] Seasons with unusual match counts

**Checkpoint:** 5 issues need fixing; whitespace affects 76 / 74 / 75 / 170 rows (Player_1 / Player_2 / Winner / Tournament).

## Phase 3: Fix them
Apply one rule per issue, logging rows before and after each step to `docs/cleaning_log.csv`.
- [ ] Strip whitespace from all text columns
- [ ] Filter to 2015–2026
- [ ] Replace sentinel values with blank
- [ ] Drop duplicates and invalid winners (expect zero, but prove it)
- [ ] Write a score-completeness function; flag retirements with `Retired = 1` (keep, don't drop)

**Checkpoint:** 6 incomplete-score matches in 2015–2025.

## Phase 4: Select 100 players
- [ ] Count matches per player per surface, 2015–2025, counting both `Player_1` and `Player_2`
- [ ] Keep players with at least 20 matches on every surface
- [ ] Export `selected_players.csv` with their counts

**Checkpoint:** exactly 100 players out of 802.

**Tradeoff to state in the README:** at n = 20, the 95% margin on a win % is about ±22 points. A cutoff of 30 gives 60 players (±18); a cutoff of 40 gives 33 players (±15).

## Phase 5: Reshape to one row per player per match
- [ ] Copy A: Player_1 as `Player`; copy B: columns swapped so Player_2 is `Player`
- [ ] Flip set scores in copy B so they read from the player's side
- [ ] Stack A and B; filter to the 100 players
- [ ] Add `Won` (1/0)
- [ ] Add `Implied_Win_Prob` = (1/player_odd) ÷ (1/player_odd + 1/opp_odd)
- [ ] Add `Odds_Missing` flag and `Split` (analysis / holdout)

**Checkpoint:** for every non-retired row, the score agrees with `Won`. Zero mismatches.

## Phase 6: Export and document
- [ ] Write `player_matches.csv` and `cleaning_log.csv`
- [ ] Finish `DISCREPANCIES.md`
- [ ] Write `README.md`: question, selection rule, cleaning steps, data source credit, how to run
- [ ] Commit after each phase, not only at the end

---

## Phase 7: Excel analysis
- [ ] Import `player_matches.csv` (Power Query or Data → From Text/CSV)
- [ ] Build a 100-row player summary: matches, win %, and expected win % per surface
- [ ] Surface gap per player: clay − hard and grass − hard, raw and vs expected
- [ ] 95% margin of error per estimate: `1.96 * SQRT(p*(1-p)/n)`
- [ ] Count true specialists: players whose gap exceeds their margin of error
- [ ] `CORREL` between clay gap and grass gap across players
- [ ] `CHISQ.TEST` on won/lost × surface
- [ ] Regression (Analysis ToolPak): `Won` on surface dummies + implied win probability

## Phase 8: Predict and validate
- [ ] Per player and surface, predict 2026 win % from 2015–2025 (overall average vs `FORECAST.LINEAR` trend)
- [ ] Compare predictions to actual 2026 results
- [ ] Report mean absolute error across players; note which method was more accurate

## Phase 9: Write up
- [ ] Answer the question in one paragraph with numbers
- [ ] Charts: distribution of surface gaps, specialists vs all-courters, predicted vs actual 2026
- [ ] Limitations: small grass samples, 2020 half season, no serve stats, 2026 partial
- [ ] Update README with findings