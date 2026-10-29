// Quickcheck: verifies the parse / aggregate / render contracts on synthetic
// data, including the width rules from the plan's e.g. (10-digit tokens,
// 26-char labels, at least one space between every pair of adjacent cells).
// No dependencies, Node >= 20 ESM. Fixtures are written to os.tmpdir()
// only; ~/.pi/agent/sessions is never read.
//
// Usage: node tools/pi-usage/tests/quickcheck.js
// Prints "PASS n/n" and exits 0, or prints failures and exits 1.

import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseSessionFile } from "../parse.js";
import { aggregate } from "../aggregate.js";
import { renderSummary } from "../render.js";

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failures.push(`${name}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

function checkTrue(name, condition) {
  if (condition) {
    passed++;
  } else {
    failures.push(`${name}\n  expected truthy`);
  }
}

// --- fixture for parseSessionFile -------------------------------------------

const tmp = mkdtempSync(join(tmpdir(), "pi-usage-quickcheck-"));
const fixture = join(tmp, "session.jsonl");
writeFileSync(
  fixture,
  [
    '{"type":"session","id":"s1","timestamp":"2026-04-15T09:09:59.168Z","cwd":"/home/pcaro"}',
    '{"type":"model_change","provider":"p","modelId":"m1"}',
    '{"type":"model_change","provider":"q","modelId":"m2"}',
    '{"type":"message","message":{"role":"assistant","usage":{"input":10,"output":5,"cacheRead":1,"cacheWrite":2,"totalTokens":18,"cost":{"total":0.25}}}}',
    '{"type":"message","message":{"role":"user","usage":{"input":99,"output":99,"totalTokens":999,"cost":{"total":9}}}}',
    "not json at all",
    '{"type":"message","message":{"role":"assistant"}}',
    '{"type":"message","message":{"role":"assistant","usage":{"input":20,"output":10,"cacheRead":2,"cacheWrite":4,"totalTokens":36,"cost":{"total":0.5}}}}',
  ].join("\n"),
);

// --- parseSessionFile --------------------------------------------------------

const session = parseSessionFile(fixture);
check("parse id", session.id, "s1");
check("parse cwd", session.cwd, "/home/pcaro");
check("parse project (last segment of cwd)", session.project, "pcaro");
check("parse startedAt", session.startedAt, "2026-04-15T09:09:59.168Z");
check("parse model (last model_change wins)", session.model, "q/m2");
check("parse turns (assistant messages only)", session.turns, 3);
check("parse tokens", session.tokens, { input: 30, output: 15, cacheRead: 3, cacheWrite: 6, total: 54 });
check("parse cost", session.cost, 0.75);

const noModelFixture = join(tmp, "nomodel.jsonl");
writeFileSync(
  noModelFixture,
  ['{"type":"session","id":"s2","timestamp":"2026-10-01T00:00:00Z","cwd":"/home/pcaro/.pi/agent"}'].join("\n"),
);
const noModel = parseSessionFile(noModelFixture);
check("parse model null without model_change", noModel.model, null);
check("parse startedAt is always a string", noModel.startedAt, "2026-10-01T00:00:00Z");
check("parse project nested cwd", noModel.project, "agent");

// A session record without a timestamp is not a session: parse must throw
// instead of returning a Session with `startedAt: null`.
let threwNoTimestamp = false;
try {
  const f = join(tmp, "no-timestamp.jsonl");
  writeFileSync(f, '{"type":"session","id":"s3","cwd":"/a/b"}');
  parseSessionFile(f);
} catch {
  threwNoTimestamp = true;
}
checkTrue("parse throws on session record without timestamp", threwNoTimestamp);

// --- aggregate ---------------------------------------------------------------

const sessions = [
  { id: "a", project: "agent", model: "m/1", startedAt: "2026-10-02T10:00:00Z", turns: 2, tokens: { total: 100 }, cost: 0.5 },
  { id: "b", project: "agent", model: "m/1", startedAt: "2026-10-03T10:00:00Z", turns: 3, tokens: { total: 200 }, cost: 0.25 },
];

check(
  "aggregate e.g. from contract",
  aggregate(sessions),
  {
    totals: { sessions: 2, turns: 5, tokens: 300, cost: 0.75 },
    byProject: [{ project: "agent", sessions: 2, turns: 5, tokens: 300, cost: 0.75 }],
    byModel: [{ model: "m/1", sessions: 2, turns: 5, tokens: 300, cost: 0.75 }],
    byDay: [
      { day: "2026-10-02", sessions: 1, turns: 2, tokens: 100, cost: 0.5 },
      { day: "2026-10-03", sessions: 1, turns: 3, tokens: 200, cost: 0.25 },
    ],
  },
);

check(
  "aggregate empty input",
  aggregate([]),
  { totals: { sessions: 0, turns: 0, tokens: 0, cost: 0 }, byProject: [], byModel: [], byDay: [] },
);

const sorted = aggregate([
  { id: "c", project: "cheap", model: null, startedAt: "2026-10-02T00:00:00Z", turns: 1, tokens: { total: 1 }, cost: 0.1 },
  { id: "d", project: "dear", model: "m/2", startedAt: "2026-10-01T00:00:00Z", turns: 1, tokens: { total: 2 }, cost: 2 },
]);
check("aggregate byProject sorted by cost desc", sorted.byProject.map((r) => r.project), ["dear", "cheap"]);
check("aggregate byModel sorted by cost desc", sorted.byModel.map((r) => r.model), ["m/2", "unknown"]);
check("aggregate byDay sorted asc", sorted.byDay.map((r) => r.day), ["2026-10-01", "2026-10-02"]);

// --- renderSummary -----------------------------------------------------------

const summary = aggregate(sessions);
const text = renderSummary(summary);

checkTrue("render is a non-empty string", typeof text === "string" && text.length > 0);
checkTrue(
  "render has PROJECT, MODEL, DAY tables in order",
  text.indexOf("PROJECT") < text.indexOf("MODEL") &&
    text.indexOf("MODEL") < text.indexOf("DAY"),
);
checkTrue("render has exactly three TOTAL rows", (text.match(/^TOTAL/gm) ?? []).length === 3);
checkTrue("render cost formatted $0.7500", text.includes("$0.7500"));
checkTrue("render shows project row agent", /^agent\s/m.test(text));
checkTrue("render shows model row m/1", /^m\/1\s/m.test(text));
checkTrue("render has no ANSI escapes", !/\u001b\[/.test(text));
checkTrue(
  "render header has SESSIONS TURNS TOKENS COST columns",
  /SESSIONS\s+TURNS\s+TOKENS\s+COST/.test(text),
);

const emptyText = renderSummary({ totals: { sessions: 0, turns: 0, tokens: 0, cost: 0 }, byProject: [], byModel: [], byDay: [] });
checkTrue("render empty input still has three TOTAL rows", (emptyText.match(/^TOTAL/gm) ?? []).length === 3);
checkTrue("render empty input prints $0.0000", emptyText.includes("$0.0000"));

const manyDays = Array.from({ length: 15 }, (_, i) => ({
  id: `d${i}`,
  project: "p",
  model: "m",
  startedAt: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
  turns: 1,
  tokens: { total: 1 },
  cost: 1,
}));
const topText = renderSummary(aggregate(manyDays), { top: 3 });
const daySection = topText.slice(topText.indexOf("DAY"));
checkTrue(
  "render opts.top limits data rows (3 of 15 days shown)",
  (daySection.match(/^\d{4}-\d{2}-\d{2}/gm) ?? []).length === 3,
);

const defaultTopText = renderSummary(aggregate(manyDays));
const defaultDaySection = defaultTopText.slice(defaultTopText.indexOf("DAY"));
checkTrue(
  "render default top is 10",
  (defaultDaySection.match(/^\d{4}-\d{2}-\d{2}/gm) ?? []).length === 10,
);

// --- renderSummary: width rules from the plan's e.g. --------------------------
//
// The e.g. of the renderSummary contract: 10-digit tokens, a 26-char model
// label, and the rule that no value may be glued to its neighbour (at least
// one space between every pair of adjacent cells). These asserts are written
// against that contract, not against any particular width computation.

const wideSummary = {
  totals: { sessions: 1, turns: 2, tokens: 1508466956, cost: 0.5 },
  byProject: [{ project: "agent", sessions: 1, turns: 2, tokens: 1508466956, cost: 0.5 }],
  byModel: [{ model: "opencode-go/deepseek-v4-pro", sessions: 1, turns: 2, tokens: 1508466956, cost: 0.5 }],
  byDay: [],
};
const wide = renderSummary(wideSummary);

checkTrue(
  "render wide e.g.: PROJECT row keeps every cell separated (10-digit tokens)",
  /^agent +1 +2 +1508466956 +\$0\.5000$/m.test(wide),
);
checkTrue(
  "render wide e.g.: MODEL row keeps 26-char label separated from numbers",
  /^opencode-go\/deepseek-v4-pro +1 +2 +1508466956 +\$0\.5000$/m.test(wide),
);
checkTrue(
  "render wide e.g.: all three TOTAL rows keep cells separated",
  (wide.match(/^TOTAL +1 +2 +1508466956 +\$0\.5000$/gm) ?? []).length === 3,
);
checkTrue(
  "render wide e.g.: 26-char label is never truncated",
  wide.includes("opencode-go/deepseek-v4-pro"),
);
checkTrue(
  "render wide e.g.: header cells keep separation with wide data",
  /^PROJECT +SESSIONS +TURNS +TOKENS +COST$/m.test(wide) &&
    /^MODEL +SESSIONS +TURNS +TOKENS +COST$/m.test(wide),
);
checkTrue(
  "render negative cost propagated as-is (never clipped to zero)",
  renderSummary({
    totals: { sessions: 1, turns: 1, tokens: 10, cost: -0.25 },
    byProject: [{ project: "refunds", sessions: 1, turns: 1, tokens: 10, cost: -0.25 }],
    byModel: [],
    byDay: [],
  }).includes("$-0.2500"),
);

// --- teardown & report -------------------------------------------------------

rmSync(tmp, { recursive: true, force: true });

const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`PASS ${total}/${total}`);
} else {
  console.log(`FAIL`);
  for (const f of failures) console.error(f);
  process.exitCode = 1;
}
