// renderSummary: Summary -> string with three aligned tables (PROJECT, MODEL, DAY).

function fmtCost(cost) {
  return `$${Number(cost).toFixed(4)}`;
}

/**
 * Build one table: header row, data rows (already limited by `top`), TOTAL row.
 * Column widths are computed from the data — the widest cell wins, header
 * included — so columns always widen to fit and never truncate. Label is
 * left-aligned, numbers and cost right-aligned, one space between columns.
 */
function table(label, key, rows, totals, top) {
  const data = (rows ?? [])
    .slice(0, top)
    .map((r) => [
      String(r[key]),
      String(r.sessions),
      String(r.turns),
      String(r.tokens),
      fmtCost(r.cost),
    ]);

  const totalRow = [
    "TOTAL",
    String(totals.sessions),
    String(totals.turns),
    String(totals.tokens),
    fmtCost(totals.cost),
  ];

  const headers = [label, "SESSIONS", "TURNS", "TOKENS", "COST"];
  const all = [headers, ...data, totalRow];
  const widths = headers.map((h, i) => Math.max(h.length, ...all.map((row) => row[i].length)));

  const line = (row) =>
    row[0].padEnd(widths[0]) +
    " " +
    row
      .slice(1)
      .map((cell, i) => cell.padStart(widths[i + 1]))
      .join(" ");

  return [line(headers), ...data.map(line), line(totalRow)];
}

/**
 * renderSummary(summary, opts?) -> string
 * Returns three tables in order PROJECT, MODEL, DAY, each with a header row
 * and a final TOTAL row using summary.totals. opts.top (default 10) limits
 * data rows per table (input arrays are expected pre-sorted by aggregate).
 * Cost is printed with a `$` prefix and 4 decimals, negatives included as-is.
 */
export function renderSummary(summary, opts = {}) {
  const top = opts?.top ?? 10;
  const totals = summary.totals ?? { sessions: 0, turns: 0, tokens: 0, cost: 0 };

  return (
    [
      ...table("PROJECT", "project", summary.byProject, totals, top),
      "",
      ...table("MODEL", "model", summary.byModel, totals, top),
      "",
      ...table("DAY", "day", summary.byDay, totals, top),
    ].join("\n") + "\n"
  );
}
