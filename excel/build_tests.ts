// Builds the Tests sheet: a chi-square test (won/lost x surface) and a
// regression of Won on surface dummies + bookmaker implied win probability.
// Analysis split only (2015-2025). Uses LINEST because Excel for the web
// has no Analysis ToolPak.
// Run in Excel for the web: Automate > New Script > paste > Run.
// Needs a table called "Matches" holding data/clean/player_matches.csv.

function main(workbook: ExcelScript.Workbook) {
  const old = workbook.getWorksheet("Tests");
  if (old) {
    old.delete();
  }
  const sheet = workbook.addWorksheet("Tests");
  const inWindow = `Matches[Split],"analysis"`;

  // ---------- 1. Chi-square: is winning independent of surface? ----------
  sheet.getRange("A1").setValue("1. Chi-square test: won/lost x surface (2015-2025)");

  // Observed counts
  sheet.getRange("A3:D3").setValues([["Observed", "Won", "Lost", "Total"]]);
  sheet.getRange("A4:A7").setValues([["Hard"], ["Clay"], ["Grass"], ["Total"]]);
  const observed: string[][] = [];
  const surfaces = ["Hard", "Clay", "Grass"];
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    const r = i + 4;
    observed.push([
      `=COUNTIFS(Matches[Surface],"${s}", ${inWindow}, Matches[Won],1)`,
      `=COUNTIFS(Matches[Surface],"${s}", ${inWindow}, Matches[Won],0)`,
      `=B${r}+C${r}`
    ]);
  }
  sheet.getRange("B4:D6").setFormulas(observed);
  sheet.getRange("B7:D7").setFormulas([["=SUM(B4:B6)", "=SUM(C4:C6)", "=SUM(D4:D6)"]]);

  // Win rate per surface
  sheet.getRange("E3").setValue("Win %");
  sheet.getRange("E4:E7").setFormulas([["=B4/D4"], ["=B5/D5"], ["=B6/D6"], ["=B7/D7"]]);
  sheet.getRange("E4:E7").setNumberFormat("0.0%");

  // Expected counts if surface made no difference: row total x column total / grand total
  sheet.getRange("G3:I3").setValues([["Expected", "Won", "Lost"]]);
  sheet.getRange("G4:G6").setValues([["Hard"], ["Clay"], ["Grass"]]);
  const expected: string[][] = [];
  for (let r = 4; r <= 6; r++) {
    expected.push([`=$D${r}*B$7/$D$7`, `=$D${r}*C$7/$D$7`]);
  }
  sheet.getRange("H4:I6").setFormulas(expected);
  sheet.getRange("H4:I6").setNumberFormat("0.0");

  sheet.getRange("A9:B11").setValues([
    ["p-value (CHISQ.TEST)", ""],
    ["Chi-square statistic (df = 2)", ""],
    ["Significant at 5%?", ""]
  ]);
  sheet.getRange("B9:B11").setFormulas([
    ["=CHISQ.TEST(B4:C6,H4:I6)"],
    ["=CHISQ.INV.RT(B9,2)"],
    [`=IF(B9<0.05,"Yes","No")`]
  ]);
  sheet.getRange("B9").setNumberFormat("0.0000");
  sheet.getRange("B10").setNumberFormat("0.00");

  // ---------- 2. Regression: Won ~ Clay + Grass + Implied_Win_Prob ----------
  sheet.getRange("A14").setValue("2. Regression (LINEST): Won on Clay, Grass and Implied_Win_Prob (2015-2025, rows with odds)");

  // LINEST returns columns in REVERSE order of the inputs, then the intercept
  sheet.getRange("A16:E16").setValues([["", "Implied_Win_Prob", "Grass", "Clay", "Intercept"]]);
  sheet.getRange("A17:A21").setValues([
    ["Coefficient"], ["Std error"], ["R² | SE of y"], ["F | df"], ["SS reg | SS resid"]
  ]);
  const keep = `(Matches[Split]="analysis")*(Matches[Odds_Missing]=0)`;
  sheet.getRange("B17").setFormula(
    // IFERROR blanks the #N/A cells LINEST leaves in its stats rows
    `=IFERROR(LINEST(FILTER(Matches[Won],${keep}),` +
    `FILTER(HSTACK(--(Matches[Surface]="Clay"),--(Matches[Surface]="Grass"),Matches[Implied_Win_Prob]),${keep}),` +
    `TRUE,TRUE),"")`
  );

  // t-statistics: coefficient / standard error (|t| > 1.96 = significant at 5%)
  sheet.getRange("A22").setValue("t-statistic");
  sheet.getRange("B22:E22").setFormulas([["=B17/B18", "=C17/C18", "=D17/D18", "=E17/E18"]]);
  sheet.getRange("A23").setValue("Significant at 5%?");
  sheet.getRange("B23:E23").setFormulas([[
    `=IF(ABS(B22)>1.96,"Yes","No")`, `=IF(ABS(C22)>1.96,"Yes","No")`,
    `=IF(ABS(D22)>1.96,"Yes","No")`, `=IF(ABS(E22)>1.96,"Yes","No")`
  ]]);
  sheet.getRange("B17:E18").setNumberFormat("0.0000");
  sheet.getRange("B22:E22").setNumberFormat("0.00");

  // ---------- Notes ----------
  sheet.getRange("A26:A30").setValues([
    ["Notes"],
    ["Chi-square: compares actual wins/losses per surface with what we'd expect if surface made no difference."],
    ["Many matches are between two selected players, so they appear twice (once as a win, once as a loss); rows are not fully independent, so read p-values with care."],
    ["Regression: a linear probability model. Clay and Grass are measured against Hard (the baseline)."],
    ["Implied_Win_Prob coefficient near 1 = bookmaker odds are well calibrated; surface coefficients near 0 = surface adds little once the odds are known."]
  ]);

  // Formatting
  for (const cell of ["A1", "A14", "A26"]) {
    sheet.getRange(cell).getFormat().getFont().setBold(true);
  }
  for (const row of ["A3:I3", "A16:E16"]) {
    sheet.getRange(row).getFormat().getFont().setBold(true);
  }
  // Fit B-I to their contents; give A a fixed width so long titles spill over instead of widening it
  sheet.getRange("B3:I23").getFormat().autofitColumns();
  sheet.getRange("A:A").getFormat().setColumnWidth(180);
  sheet.activate();
}
