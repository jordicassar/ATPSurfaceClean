# ATPSurfaceClean

How does court surface affect ATP players' results, and can a player's past record on each surface predict how they will do next season?

This repo takes a raw dataset of ATP matches, documents every problem found in it, and cleans it into an analysis-ready table for 100 players. The analysis itself is done in Excel.

## The question

For a fixed group of ATP players over 2015–2025, how does surface (hard, clay, grass) affect their win rate? And can those surface records predict their results in the 2026 season?

## Data

- **Source:** [ATP Tennis 2000 - 2023 Daily Pull](https://www.kaggle.com/datasets/dissfya/atp-tennis-2000-2023daily-pull) by dissfya on Kaggle. ATP main-tour results with rankings, ranking points and bookmaker odds.
- **License:** CC0 Public Domain.
- **Version used:** downloaded October 2026. The latest match in the file is 29 Aug 2026, and it has 68,635 matches × 17 columns from 3 Jan 2000. The source is updated regularly, so a fresh download may contain more 2026 matches.
- **Analysis window:** 2015–2025.
- **Holdout:** the 2026 season (to 29 Aug), used only to test predictions.

The raw file is kept unedited in `data/raw/`.

## Choosing the players

Players are chosen by a rule, not by hand: **at least 20 matches on every surface (hard, clay and grass) in 2015–2025.** Of the 788 players in that window, exactly **100** qualify.

The cutoff is a tradeoff between how many players you study and how precise each estimate is. The margin of error is the 95% margin on a 50% win rate:

| Minimum matches per surface | Players | Margin of error |
|---|---|---|
| **20** (used) | **100** | ±22 points |
| 30 | 61 | ±18 points |
| 40 | 33 | ±15 points |

Grass is the limiting surface: it has the shortest season, and several selected players have exactly 20 grass matches.

## Data problems found and fixed

Profiling found 11 kinds of issue. Each one is described, counted and explained in [Discrepancies.md](Discrepancies.md). The main ones:

- **Missing values stored as `-1`**, so a null check reports zero missing values.
- **Stray spaces in names**, which create 69 fake extra players.
- **The same player under different spellings** (e.g. `Carreno-Busta P.` / `Carreno Busta P.`, four versions of Herbert).
- **Grand Slam matches labelled best-of-3**, one per year.
- **Retirements with no label**, detected by checking whether the score is complete.
- **Corrupted scores**, such as `8-7` sets or a stray unfinished set. Each phase's checks caught one the previous phase missed.

`clean.py` applies one rule per issue. It records the rows before and after each step, and the values changed, in [docs/cleaning_log.csv](docs/cleaning_log.csv):

| Step | Effect |
|---|---|
| 1. Strip whitespace from text columns | 395 values |
| 2. Merge name variants (explicit mapping, checked by hand) | 604 values |
| 3. Keep 2015–2026 | 68,635 → 28,489 matches |
| 4. Replace `-1` with blank | 36 values (18 matches with missing odds) |
| 5. Set Grand Slams to best of 5 | 11 matches |
| 6. Drop duplicates and invalid winners | 0 found (checked, not assumed) |
| 7. Flag retirements (`Retired = 1`) | 4 matches |
| 8. Flag corrupted scores (`Score_Error = 1`) | 5 matches (4 + 1 in 2026) |

Flagged matches are kept, not dropped: the winner is still known, and only the score is unreliable.

## Output

**`data/clean/player_matches.csv`** has one row per player per match for the 100 selected players: **31,623 rows** (30,204 analysis, 1,419 holdout). Each match appears once from the player's point of view, with the score flipped to read from their side.

| Column | Meaning |
|---|---|
| `Date`, `Tournament`, `Series`, `Court`, `Surface`, `Round`, `Best of` | Match details |
| `Player`, `Opponent` | The selected player and their opponent |
| `Rank`, `Opp_Rank`, `Pts`, `Opp_Pts` | ATP ranking and points for each side |
| `Odd`, `Opp_Odd` | Bookmaker decimal odds for each side |
| `Score` | Set scores from the player's side (e.g. `6-3 4-6 7-5`) |
| `Won` | 1 if the player won, 0 if not |
| `Implied_Win_Prob` | Bookmaker's win probability with their margin removed: (1/Odd) ÷ (1/Odd + 1/Opp_Odd) |
| `Odds_Missing` | 1 if either odd is missing (11 rows) |
| `Retired`, `Score_Error` | Flags from cleaning steps 7 and 8 |
| `Split` | `analysis` (2015–2025) or `holdout` (2026) |

**`data/clean/selected_players.csv`** lists the 100 players with their match counts on hard, clay and grass.

**Check:** for every row not flagged `Retired` or `Score_Error`, the score agrees with `Won`. There are 0 mismatches.

## How to run

You need Python 3 installed. From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python profile_data.py   # read-only: prints every check behind Discrepancies.md
python clean.py          # writes the files in data/clean/ and docs/cleaning_log.csv
```

## Repo structure

```
profile_data.py                  profiling: finds and counts the data problems (changes nothing)
clean.py                         cleaning, player selection, reshape and export
Discrepancies.md                 every data issue, how it was found, and how it was handled
requirements.txt                 Python dependencies
data/raw/atp_tennis.csv          original file, never edited
data/clean/player_matches.csv    one row per player per match (the analysis table)
data/clean/selected_players.csv  the 100 players and their matches per surface
docs/cleaning_log.csv            rows and values changed by each cleaning step
excel/                           Excel analysis (in progress)
```

## Findings

*In progress.* The Excel analysis (surface gaps per player, margins of error, surface specialists, and predictions tested against 2026) will be summarised here.

## Limitations

- **Small grass samples:** at 20 matches, a grass win rate is only accurate to about ±22 points.
- **2020 was a half season** (COVID) with no Wimbledon, so there were almost no grass matches.
- **2026 is partial** (to 29 Aug). The missing autumn is mostly hard courts, so the holdout's surface mix is skewed.
- **No serve or point-level statistics**, only results, rankings and odds.

## License

Code is released under the [MIT License](LICENSE). The dataset is CC0 Public Domain, from [dissfya on Kaggle](https://www.kaggle.com/datasets/dissfya/atp-tennis-2000-2023daily-pull).
