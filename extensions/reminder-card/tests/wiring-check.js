// Wiring check: drives the real extension entry point (../index.ts) through a
// fake ExtensionAPI and fake session contexts, asserting the session_start
// gating matrix, the /remind command, resources_discover and the entry
// renderer. Needs no pi and no network: index.ts imports only *types* from
// the pi package, which Node's type stripping erases before execution.
// The real cards.md next to index.ts is used, so card picks are real cards.
//
// Usage: node extensions/reminder-card/tests/wiring-check.js
// Prints "PASS n/n" and exits 0, or prints failures and exits 1.

import reminderCardExtension from "../index.ts";

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

// --- fake pi / ctx -----------------------------------------------------------

function makeFakePi() {
  const handlers = {};
  const renderers = {};
  const commands = {};
  const appendCalls = [];
  const pi = {
    on(event, handler) {
      handlers[event] = handler;
    },
    appendEntry(type, data) {
      appendCalls.push({ type, data });
    },
    registerEntryRenderer(type, renderer) {
      renderers[type] = renderer;
    },
    registerCommand(name, def) {
      commands[name] = def;
    },
  };
  return { pi, handlers, renderers, commands, appendCalls };
}

function makeFakeCtx({ hasUI = true, entries = [] } = {}) {
  const notifies = [];
  const ctx = {
    hasUI,
    ui: { notify: (msg, level) => notifies.push({ msg, level }) },
    sessionManager: { getEntries: () => entries },
  };
  return { ctx, notifies };
}

const { pi, handlers, renderers, commands, appendCalls } = makeFakePi();
reminderCardExtension(pi);

const CARD_TYPE = "reminder-card:card";
const cardsAppended = () => appendCalls.filter((c) => c.type === CARD_TYPE);

const messageEntry = { type: "message", message: { role: "user", content: "hi" } };
// A fresh `pi` start: only meta entries, no messages yet.
const freshEntries = [
  { type: "model_change", provider: "p", modelId: "m" },
  { type: "thinking_level_change", level: "high" },
];

const sessionStart = (reason, ctxOpts) => {
  appendCalls.length = 0;
  handlers.session_start({ reason }, makeFakeCtx(ctxOpts).ctx);
  return cardsAppended();
};

// --- session_start gating ------------------------------------------------------

const freshCards = sessionStart("startup", { entries: [] });
check("fresh startup (no entries): 1 card", freshCards.length, 1);
checkTrue("appended card data has index/title/lines", typeof freshCards[0].data.index === "number" && typeof freshCards[0].data.title === "string" && Array.isArray(freshCards[0].data.lines));
check(
  "fresh startup (only model_change entries): 1 card",
  sessionStart("startup", { entries: freshEntries }).length,
  1,
);
check(
  "continued startup (pi -c, message entries): 0 cards",
  sessionStart("startup", { entries: [...freshEntries, messageEntry] }).length,
  0,
);
check(
  "new with messages: 1 card",
  sessionStart("new", { entries: [messageEntry] }).length,
  1,
);
check("resume with messages: 0 cards", sessionStart("resume", { entries: [messageEntry] }).length, 0);
check("fork with messages: 0 cards", sessionStart("fork", { entries: [messageEntry] }).length, 0);
check("reload with messages: 0 cards", sessionStart("reload", { entries: [messageEntry] }).length, 0);
check("startup without UI: 0 cards", sessionStart("startup", { hasUI: false, entries: [] }).length, 0);

// --- resources_discover ----------------------------------------------------------

const resources = handlers.resources_discover();
checkTrue(
  "resources_discover returns one skillPaths entry ending in /skills",
  Array.isArray(resources.skillPaths) && resources.skillPaths.length === 1 && resources.skillPaths[0].endsWith("/skills"),
);

// --- /remind -----------------------------------------------------------------------

const runRemind = async (args) => {
  appendCalls.length = 0;
  const { ctx, notifies } = makeFakeCtx({});
  await commands.remind.handler(args, ctx);
  return { cards: cardsAppended(), notifies };
};

const random = await runRemind("");
check("/remind: exactly 1 card", random.cards.length, 1);
checkTrue(
  "/remind: card index is one of the 7 real cards",
  random.cards[0].data.index >= 1 && random.cards[0].data.index <= 7,
);

const byIndex = await runRemind("3");
check("/remind 3: exactly 1 card", byIndex.cards.length, 1);
check("/remind 3: card index is 3", byIndex.cards[0].data.index, 3);

const notFound = await runRemind("99");
check("/remind 99: 0 cards", notFound.cards.length, 0);
checkTrue(
  "/remind 99: warning notify",
  notFound.notifies.length === 1 && notFound.notifies[0].level === "warning" && /not found/.test(notFound.notifies[0].msg),
);

const list = await runRemind("list");
check("/remind list: 0 cards", list.cards.length, 0);
checkTrue(
  "/remind list: plain notify listing all 7 titles",
  list.notifies.length === 1 &&
    list.notifies[0].level === undefined &&
    list.notifies[0].msg.startsWith("1. ") &&
    (list.notifies[0].msg.match(/ · /g) ?? []).length === 6,
);

// --- entry renderer -----------------------------------------------------------------

const renderer = renderers[CARD_TYPE];
const theme = { fg: (_color, s) => s };

check("renderer returns undefined for empty data", renderer({ data: {} }, {}, theme), undefined);

const component = renderer({ data: { index: 1, title: "T", lines: ["hello"] } }, {}, theme);
checkTrue("renderer returns a component for valid data", typeof component?.render === "function" && typeof component?.invalidate === "function");
const box = component.render(80);
checkTrue(
  "rendered component is a rounded box",
  Array.isArray(box) && box.length > 3 && box[0].startsWith("╭") && box[box.length - 1].startsWith("╰") && box.slice(1, -1).every((l) => l.startsWith("│") && l.endsWith("│")),
);
component.invalidate(); // must not throw

// --- report ---------------------------------------------------------------------------

const total = passed + failures.length;
if (failures.length === 0) {
  console.log(`PASS ${total}/${total}`);
} else {
  console.log(`FAIL`);
  for (const f of failures) console.error(f);
  process.exitCode = 1;
}
