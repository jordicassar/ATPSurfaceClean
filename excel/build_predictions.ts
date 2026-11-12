// @ts-nocheck
// Builds the Predictions sheet (Phase 8): for each player and surface, predict the
// 2026 win % from 2015-2025 in two ways and compare with the actual 2026 holdout.
//   Avg   = overall 2015-2025 win %
//   Trend = FORECAST.LINEAR through the yearly win %, extended to 2026 (kept between 0 and 1)
// Error = |prediction - actual|. MAE is averaged over pairs with at least W2 matches in 2026.
// Run in Excel for the web: Automate > New Script > paste > Run.
// Needs the "Matches" table and the "Summary" sheet (player list in Summary!A2:A101).

function main(workbook: ExcelScript.Workbook) {
  const summary = workbook.getWorksheet("Summary");
  const players = summary.getRange("A2:A101").getValues().map(r => String(r[0]));
  const surfaces = ["Hard", "Clay", "Grass"];
  const years: number[] = [];
  for (let y = 2015; y <= 2025; y++) {
    years.push(y);
  }

  const old = workbook.getWorksheet("Predictions");
  if (old) {
    old.delete();
  }
  const sheet = workbook.addWorksheet("Predictions");

  // Row 1: headers. C1:M1 hold the years as numbers so formulas can use them.
  const headers: (string | number)[] = ["Player", "Surface"];
  for (const y of years) {
    headers.push(y);
  }
  headers.push("Avg_2015_25", "Trend_2026", "n_2026", "Actual_2026", "Err_Avg", "Err_Trend", "Included");
  sheet.getRange("A1:T1").setValues([headers]);

  // One row per player x surface (300 rows)
  const labels: string[][] = [];
  const formulas: string[][] = [];
  const cols = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
  let r = 2;
  for (const p of players) {
    for (const s of surfaces) {
      labels.push([p, s]);
      const who = `Matches[Player],$A${r}, Matches[Surface],$B${r}`;
      const row: string[] = [];
      // Yearly win % (blank if no matches that year)
      for (const c of cols) {
        row.push(
          `=IFERROR(AVERAGEIFS(Matches[Won], ${who}, ` +
          `Matches[Date],">="&DATE(${c}$1,1,1), Matches[Date],"<="&DATE(${c}$1,12,31)),"")`
        );
      }
      const has = `C${r}:M${r}<>""`;
      row.push(
        // N: overall 2015-2025 win %
        `=AVERAGEIFS(Matches[Won], ${who}, Matches[Split],"analysis")`,
        // O: linear trend through the yearly win %, extended to 2026, kept in 0-1
        `=IFERROR(MAX(0,MIN(1,FORECAST.LINEAR(2026, FILTER(C${r}:M${r},${has}), FILTER($C$1:$M$1,${has})))),"")`,
        // P: matches in 2026
        `=COUNTIFS(${who}, Matches[Split],"holdout")`,
        // Q: actual 2026 win %
        `=IF(P${r}=0,"",AVERAGEIFS(Matches[Won], ${who}, Matches[Split],"holdout"))`,
        // R, S: absolute errors
        `=IF(Q${r}="","",ABS(N${r}-Q${r}))`,
        `=IF(OR(Q${r}="",O${r}=""),"",ABS(O${r}-Q${r}))`,
        // T: included in the MAE if enough 2026 matches
        `=IF(P${r}>=$W$2,1,0)`
      );
      formulas.push(row);
      r++;
    }
  }
  const last = r - 1;
  sheet.getRange(`A2:B${last}`).setValues(labels);
  sheet.getRange(`C2:T${last}`).setFormulas(formulas);

  // Formats
  sheet.getRange(`C2:O${last}`).setNumberFormat("0.0%");
  sheet.getRange(`Q2:S${last}`).setNumberFormat("0.0%");

  // Results block
  sheet.getRange("V1:W8").setValues([
    ["Result", "Value"],
    ["Minimum 2026 matches (change me)", 5],
    ["Player-surface pairs included", ""],
    ["MAE: overall average", ""],
    ["MAE: linear trend", ""],
    ["Share of pairs where average is closer", ""],
    ["Players with any 2026 matches", ""],
    ["More accurate method", ""]
  ]);
  sheet.getRange("W3:W8").setFormulas([
    [`=SUM(T2:T${last})`],
    [`=AVERAGEIFS(R2:R${last},T2:T${last},1)`],
    [`=AVERAGEIFS(S2:S${last},T2:T${last},1)`],
    [`=SUMPRODUCT((T2:T${last}=1)*(R2:R${last}<S2:S${last}))/W3`],
    [`=COUNTA(UNIQUE(FILTER(Matches[Player],Matches[Split]="holdout")))`],
    [`=IF(W4<W5,"Overall average","Linear trend")`]
  ]);
  sheet.getRange("W4:W6").setNumberFormat("0.0%");

  sheet.getRange("V10:V13").setValues([
    ["Notes"],
    ["Errors are in win-% points. Only pairs with at least W2 matches in 2026 count towards the MAE."],
    ["2026 is a partial season (to 29 Aug), and 47 of the 100 players have no 2026 matches (mostly retired)."],
    ["Small 2026 samples are noisy: with 5 matches, even a perfect prediction would typically miss by 15+ points."]
  ]);

  // Tidy up
  sheet.getRange("A1:T1").getFormat().getFont().setBold(true);
  sheet.getRange("V1:W1").getFormat().getFont().setBold(true);
  sheet.getRange("V10").getFormat().getFont().setBold(true);
  sheet.getFreezePanes().freezeRows(1);
  sheet.getRange(`A1:T${last}`).getFormat().autofitColumns();
  sheet.getRange("V1:W8").getFormat().autofitColumns();
  sheet.activate();
}
