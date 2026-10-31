// Quickcheck: verifies the parseCards / renderCard contracts on synthetic
// fixtures and on the real cards.md, including the box-geometry rules from
// the plan (every rendered line exactly max(24, width) visible characters
// once ANSI is stripped, rounded corners, side rails on every middle line).
// No dependencies, Node >= 20 ESM. The real cards.md is read relative to
// this file via import.meta.url, never from a repo-relative path.
//
// Usage: node extensions/reminder-card/tests/quickcheck.js
// Prints "PASS n/n" and exits 0, or prints failures and exits 1.

import { readFileSync } from "node:fs";

import { parseCards, renderCard } from "../cards.ts";

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

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

// --- real cards.md -----------------------------------------------------------

const raw = readFileSync(new URL("../cards.md", import.meta.url), "utf8");
const cards = parseCards(raw);

check("cards.md yields exactly 7 cards", cards.length, 7);
check(
  "card indexes are 1..7 contiguous",
  cards.map((c) => c.index),
  [1, 2, 3, 4, 5, 6, 7],
);
checkTrue(
  "every card has a non-empty title",
  cards.every((c) => c.title.trim() !== ""),
);
checkTrue(
  "every card has 1-3 paragraphs (non-empty body lines)",
  cards.every((c) => {
    const paragraphs = c.lines.filter((l) => l !== "");
    return paragraphs.length >= 1 && paragraphs.length <= 3;
  }),
);
checkTrue(
  "no source line in cards.md exceeds 100 chars",
  raw.split(/\r?\n/).every((l) => l.length <= 100),
);

// --- parseCards contracts ------------------------------------------------------

check(
  "two simple cards",
  parseCards("# A\nbody\n\n---\n\n# B\nbody2"),
  [
    { index: 1, title: "A", lines: ["body"] },
    { index: 2, title: "B", lines: ["body2"] },
  ],
);
check("title-only block is dropped", parseCards("# Only a title"), []);
check(
  "block without a heading is dropped and indexes re-assigned",
  parseCards("no heading\n\n---\n\n# B\nbody"),
  [{ index: 1, title: "B", lines: ["body"] }],
);
check("empty string yields no cards", parseCards(""), []);
check("separators only yield no cards", parseCards("---\n---"), []);

// --- paragraph reflow ----------------------------------------------------------

check(
  "soft-wrapped source lines are joined per paragraph",
  parseCards("# T\nsoft\nwrapped lines\n\nsecond para"),
  [{ index: 1, title: "T", lines: ["soft wrapped lines", "", "second para"] }],
);

// --- renderCard geometry -------------------------------------------------------

for (const width of [10, 24, 40, 80, 120]) {
  const boxWidth = Math.max(24, width);
  const bad = [];
  for (const card of cards) {
    const lines = renderCard(card, width).map(stripAnsi);
    if (!lines.every((l) => l.length === boxWidth)) bad.push(`card ${card.index}: line length != ${boxWidth}`);
    if (!(lines[0].startsWith("╭") && lines[0].endsWith("╮"))) bad.push(`card ${card.index}: bad top edge`);
    if (!(lines[lines.length - 1].startsWith("╰") && lines[lines.length - 1].endsWith("╯"))) bad.push(`card ${card.index}: bad bottom edge`);
    if (!lines.slice(1, -1).every((l) => l.startsWith("│") && l.endsWith("│"))) bad.push(`card ${card.index}: bad side rail`);
  }
  check(`width ${width}: all real cards render exact box geometry`, bad, []);
}

// --- coloring ------------------------------------------------------------------

checkTrue(
  "default fg emits no ANSI anywhere",
  renderCard(cards[0], 80).every((l) => !l.includes("\x1b")),
);

const tag = (color, s) => `<${color}>${s}</>`;
const tagged = renderCard(cards[0], 80, tag).join("\n");
checkTrue("fg is applied: accent tokens present", tagged.includes("<accent>"));
checkTrue("fg is applied: text runs present", tagged.includes("<text>"));
checkTrue("fg is applied: dim box and footer present", tagged.includes("<dim>"));

// The three checks above pass even if TOKEN_RE never matches (the title is
// always accent, the body fallback is always text), so assert on rendered
// BODY lines that carry real tokens: a bare /command and a `backticked` tool.
checkTrue(
  "body command token is accent-wrapped: /brain2wave",
  tagged.includes("<accent>/brain2wave</>"),
);
const tagged2 = renderCard(cards[1], 80, tag).join("\n");
checkTrue(
  "body backticked token is accent-wrapped: `subagent`",
  tagged2.includes("<accent>`subagent`</>"),
);

// --- overlong word ---------------------------------------------------------------

const hardSplit = renderCard({ index: 1, title: "T", lines: ["x".repeat(60)] }, 40).map(stripAnsi);
checkTrue(
  "60-char unbreakable word at width 40 keeps every line at 40 visible chars",
  hardSplit.every((l) => l.length === 40),
);
checkTrue(
  "hard split loses no content: all 60 x chars recovered from the box",
  hardSplit.reduce((n, l) => n + (l.match(/x/g)?.length ?? 0), 0) === 60,
);

// --- evidence: card 1 rendered at 80 cols ----------------------------------------

console.log(renderCard(cards[0], 80).join("\n"));

// --- report ----------------------------------------------------------------------

const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`PASS ${total}/${total}`);
} else {
  console.log(`FAIL`);
  for (const f of failures) console.error(f);
  process.exitCode = 1;
}
