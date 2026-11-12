// Builds the Summary sheet: one row per selected player, with matches,
// win % and bookmaker-expected win % on each surface (analysis split only),
// plus margins of error, surface gaps vs hard, specialist flags,
// and summary counts and correlations in columns W-X.
// Run in Excel for the web: Automate > New Script > paste > Run.
// Needs a table called "Matches" holding data/clean/player_matches.csv.
// ts-nocheck

function main(workbook: ExcelScript.Workbook) {
  // The 100 players from data/clean/selected_players.csv (most matches first)
  const players: string[] = [
    "Zverev A.",
    "Djokovic N.",
    "Medvedev D.",
    "Rublev A.",
    "Dimitrov G.",
    "Mannarino A.",
    "Fritz T.",
    "Tsitsipas S.",
    "Khachanov K.",
    "Goffin D.",
    "Thiem D.",
    "Bautista Agut R.",
    "Nadal R.",
    "Schwartzman D.",
    "Cilic M.",
    "De Minaur A.",
    "Fognini F.",
    "Struff J.L.",
    "Tiafoe F.",
    "Monfils G.",
    "Gasquet R.",
    "Auger-Aliassime F.",
    "Norrie C.",
    "Wawrinka S.",
    "Isner J.",
    "Shapovalov D.",
    "Lajovic D.",
    "Sinner J.",
    "Coric B.",
    "Paire B.",
    "Nishikori K.",
    "Murray A.",
    "Sousa J.",
    "Sonego L.",
    "Hurkacz H.",
    "Bublik A.",
    "Johnson S.",
    "Paul T.",
    "Simon G.",
    "Kecmanovic M.",
    "Alcaraz C.",
    "Verdasco F.",
    "Thompson J.",
    "Fucsovics M.",
    "Basilashvili N.",
    "Djere L.",
    "Federer R.",
    "Berrettini M.",
    "Raonic M.",
    "Anderson K.",
    "Lopez F.",
    "Humbert U.",
    "Davidovich Fokina A.",
    "Musetti L.",
    "Querrey S.",
    "Evans D.",
    "Chardy J.",
    "Giron M.",
    "Kyrgios N.",
    "Kohlschreiber P.",
    "Rune H.",
    "Pouille L.",
    "Seppi A.",
    "McDonald M.",
    "Vesely J.",
    "Millman J.",
    "Korda S.",
    "Popyrin A.",
    "Berdych T.",
    "Pella G.",
    "Bedene A.",
    "Opelka R.",
    "Nakashima B.",
    "Jarry N.",
    "Albot R.",
    "Tsonga J.W.",
    "Edmund K.",
    "Garin C.",
    "Herbert P.H.",
    "Karlovic I.",
    "Haase R.",
    "Kukushkin M.",
    "Griekspoor T.",
    "Troicki V.",
    "Moutet C.",
    "Van De Zandschulp B.",
    "Rinderknech A.",
    "Muller G.",
    "Ruusuvuori E.",
    "Shelton B.",
    "Tomic B.",
    "Zverev M.",
    "Kudla D.",
    "Ivashka I.",
    "Draper J.",
    "Harris L.",
    "Istomin D.",
    "Youzhny M.",
    "Brown D.",
    "Mayer F."
  ];

  // Court Surfaces
  const surfaces = ["Hard", "Clay", "Grass"];

  // Start fresh: remove any old Summary sheet
  const old = workbook.getWorksheet("Summary");
  if (old) {
    old.delete();
  }
  const sheet = workbook.addWorksheet("Summary");

  // Row 1: headers
  const headers: string[] = ["Player"];
  for (const s of surfaces) {
    headers.push(`${s}_n`, `${s}_Win`, `${s}_Exp`);
  }
  sheet.getRange("A1:J1").setValues([headers]);

  // Column A: player names
  sheet.getRange(`A2:A${players.length + 1}`).setValues(players.map(p => [p]));

  // Columns B-J: COUNTIFS / AVERAGEIFS formulas, one row per player
  const formulas: string[][] = [];
  for (let i = 0; i < players.length; i++) {
    const r = i + 2;
    const where = `Matches[Player],$A${r}, Matches[Surface],"SURF", Matches[Split],"analysis"`;
    const row: string[] = [];
    for (const s of surfaces) {
      const w = where.replace("SURF", s);
      row.push(
        `=COUNTIFS(${w})`,
        `=AVERAGEIFS(Matches[Won], ${w})`,
        `=AVERAGEIFS(Matches[Implied_Win_Prob], ${w})`
      );
    }
    formulas.push(row);
  }
  const last = players.length + 1;
  sheet.getRange(`B2:J${last}`).setFormulas(formulas);

  // Columns K-U: margins of error, surface gaps, specialists
  // Hard = B,C,D   Clay = E,F,G   Grass = H,I,J
  sheet.getRange("K1:U1").setValues([[
    "Hard_MOE", "Clay_MOE", "Grass_MOE",           // 95% margin on each win %
    "Clay_Gap", "Grass_Gap",                       // win % vs hard
    "Clay_Gap_vsExp", "Grass_Gap_vsExp",           // same, after removing what the odds expected
    "Clay_Gap_MOE", "Grass_Gap_MOE",               // 95% margin on each gap
    "Clay_Specialist", "Grass_Specialist"          // gap bigger than its margin?
  ]]);
  const extra: string[][] = [];
  for (let i = 0; i < players.length; i++) {
    const r = i + 2;
    extra.push([
      `=1.96*SQRT(C${r}*(1-C${r})/B${r})`,
      `=1.96*SQRT(F${r}*(1-F${r})/E${r})`,
      `=1.96*SQRT(I${r}*(1-I${r})/H${r})`,
      `=F${r}-C${r}`,
      `=I${r}-C${r}`,
      `=(F${r}-G${r})-(C${r}-D${r})`,
      `=(I${r}-J${r})-(C${r}-D${r})`,
      `=1.96*SQRT(C${r}*(1-C${r})/B${r}+F${r}*(1-F${r})/E${r})`,
      `=1.96*SQRT(C${r}*(1-C${r})/B${r}+I${r}*(1-I${r})/H${r})`,
      `=IF(N${r}>R${r},"Better",IF(N${r}<-R${r},"Worse",""))`,
      `=IF(O${r}>S${r},"Better",IF(O${r}<-S${r},"Worse",""))`
    ]);
  }
  sheet.getRange(`K2:U${last}`).setFormulas(extra);

  // Win, Exp, margin and gap columns as percentages with one decimal
  for (const col of ["C", "D", "F", "G", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"]) {
    sheet.getRange(`${col}2:${col}${last}`).setNumberFormat("0.0%");
  }

  // Specialist counts and correlation, to the right of the table
  sheet.getRange("W1:X8").setValues([
    ["Result", "Value"],
    ["Clay: better than on hard", ""],
    ["Clay: worse than on hard", ""],
    ["Grass: better than on hard", ""],
    ["Grass: worse than on hard", ""],
    ["Any significant gap", ""],
    ["CORREL clay gap vs grass gap (raw)", ""],
    ["CORREL clay gap vs grass gap (vs expected)", ""]
  ]);
  sheet.getRange("X2:X8").setFormulas([
    [`=COUNTIF(T2:T${last},"Better")`],
    [`=COUNTIF(T2:T${last},"Worse")`],
    [`=COUNTIF(U2:U${last},"Better")`],
    [`=COUNTIF(U2:U${last},"Worse")`],
    [`=SUMPRODUCT(--((T2:T${last}<>"")+(U2:U${last}<>"")>0))`],
    [`=CORREL(N2:N${last},O2:O${last})`],
    [`=CORREL(P2:P${last},Q2:Q${last})`]
  ]);
  sheet.getRange("X7:X8").setNumberFormat("0.000");

  // Method notes: why gaps are measured against hard court
  sheet.getRange("W10:W13").setValues([
    ["Notes"],
    ["Gaps are measured against hard court: it is each player's largest sample, so it has the smallest margin of error."],
    ["A Hard gap would be hard minus hard = 0, so there is no Hard_Gap column. Hard still appears in B-D and K."],
    ["Specialist = gap larger than its 95% margin of error (R-S), which combines the uncertainty of both surfaces."]
  ]);
  sheet.getRange("W10").getFormat().getFont().setBold(true);

  // Tidy up: bold headers, freeze them, fit column widths
  sheet.getRange("A1:U1").getFormat().getFont().setBold(true);
  sheet.getRange("W1:X1").getFormat().getFont().setBold(true);
  sheet.getFreezePanes().freezeRows(1);
  sheet.getRange(`A1:U${last}`).getFormat().autofitColumns();
  sheet.getRange("W1:X8").getFormat().autofitColumns();   // fit to the results, not the long notes
  sheet.activate();
}
