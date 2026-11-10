# Data Discrepancies

Every issue found in `atp_tennis.csv` and how it is handled. Counts are for the whole file (2000 to Aug 2026) unless a window is stated. The analysis window is 2015–2025, and 2026 is the holdout.

| # | Issue | Columns | Rows affected | How it was found | Fix (Phase 3) |
|---|---|---|---|---|---|
| 1 | Leading/trailing spaces in text | Tournament, Player_1, Player_2, Winner | 170 / 76 / 74 / 75. Creates 69 fake extra players (1,830 → 1,761 unique names) | Compared each column with its `.str.strip()` version; `repr()` showed spaces at both ends (`' Hajek J.'`, `'Seppi A. '`) | Strip whitespace from all text columns |
| 2 | Same player under different spellings | Player_1, Player_2, Winner | 34 name pairs differ only by punctuation, spacing or case, plus extra-initial variants. Biggest in 2015–2026: Carreno Busta (53 matches under `Carreno-Busta P.`), McDonald (`Mcdonald M.` → `McDonald M.` from 2025), Herbert (~29 across `P.H`, `P.`), Varillas (19), Tseng (9) | Grouped names by surname (136 shared); normalised names (lowercase, no `.` `-` or spaces) to find collisions; year ranges per spelling | Explicit name-mapping dictionary of confirmed variants. Ambiguous cases (e.g. `Kuznetsov A.`) are left unmerged |
| 3 | Missing values stored as -1 | Rank_1/2, Pts_1/2, Odd_1/2 | All years: Pts 15,652 / 15,653, Odds 3,782 / 3,780, Rank 14 / 12. **2015–2026: 18 matches, odds only** | Null check reported 0; `describe()` showed min = -1 in all six columns; counted `== -1` per column and by year | Replace -1 with blank; add `Odds_Missing` flag (set if either odd is missing) |
| 4 | Score contradicts Winner on a completed match | Score, Winner | 11 (9 at Madrid Masters Oct 2004, 1 at French Open 2010, 1 in Feb 2026 holdout: Bergs vs Medjedovic) | Counted Player_1's sets from the score and compared with Winner: 68,622 / 68,635 agree | Trust Winner; list as known exceptions in the Phase 5 score check |
| 5 | Grand Slam matches labelled best-of-3 | Best of | 23 (one per year 2001–2026, none in 2000/2002/2003/2020). 11 in 2015–2025, 1 in 2026 | Score-completeness check flagged full five-set Wimbledon scores as "incomplete" | Set `Best of = 5` where `Series == "Grand Slam"` |
| 6 | Retirements (no "RET" label) | Score | 4 in 2015–2025: Tsonga–Bedene 2019, Nagal–Moutet 2024, Korda–Norrie 2025, Shang–Bellucci 2025 | Score-completeness function: did a player win the sets needed for the best-of format? | Keep and flag with `Retired = 1` |
| 7 | Impossible scores | Score | 2 in 2015–2025: Citi Open 2021 `7-5 6-4 7-5` (3 sets won in a best-of-3), Cincinnati 2024 `8-7 2-6` (no set ends 8-7) | Same score-completeness check | Trust Winner; list as known exceptions; not flagged as retirements |
| 8 | Carpet surface | Surface | 1,632 in total; last used 2009. **0 in 2015–2026** | `value_counts()` on Surface, then counted by year | None needed: removed by the 2015–2026 filter |
| 9 | Short seasons | Date | 2020: 1,231 matches (0.49 × the 2015–2025 median of 2,520), COVID. 2026: 1,955 (0.78), partial season to 29 Aug | Matches per year compared with the median | None: kept, noted as a limitation (fewer matches, little grass in 2020; 2026 surface mix skewed) |
| 10 | Duplicate matches | Date, Tournament, Round, Player_1, Player_2 | **0**, including with players swapped | `duplicated()` on stripped key columns | None needed: checked and confirmed |
| 11 | Winner not one of the two players | Winner, Player_1, Player_2 | **0** | Compared stripped Winner with both stripped player names | None needed: checked and confirmed |

## Notes

- **Not errors:** Series names changed in 2009 (International → ATP250, International Gold → ATP500, Masters → Masters 1000). These are renames, and they fall outside the analysis window.
- **Retirement checkpoint:** the plan expected 6 incomplete scores in 2015–2025, and the check finds 6. But only 4 are retirements; the other 2 are the impossible scores in row 7.
- All checks are reproducible with `python profile_data.py`.
