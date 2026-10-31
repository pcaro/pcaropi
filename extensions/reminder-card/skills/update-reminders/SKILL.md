---
name: update-reminders
description: Use when asked to add, edit, retire, or re-check the reminder card texts — e.g. "add a reminder card", "update the reminder texts", "remove a card", "change what /remind shows".
---

# Update Reminder Cards

The reminder-card extension shows one short tip card at session start and on demand via `/remind`, `/remind <n>`, and `/remind list`. The texts are plain prose in one file — `extensions/reminder-card/cards.md` — and never code. Editing that file is the whole job.

## File format

- Blocks are separated by a line containing only `---`.
- Each block starts with `# Title`, then a blank line, then 1–2 body paragraphs.
- Source lines may be hard-wrapped anywhere: `parseCards` reflows each paragraph's soft-wrapped lines into one logical line, so wrapping does not affect the rendered output.
- Blocks without a `# Title` or with an empty body are silently dropped; card numbers are re-assigned 1..n after filtering.

## Authoring rules

- English only. One idea per card; at most 2–3 short paragraphs.
- Keep source lines under 100 chars.
- Commands are bare (`/tree`, `/brain2wave`); tool names go in backticks (`` `subagent` ``).
- No emoji or CJK characters — the renderer's width math is code-unit based and box alignment would break.
- The copy must be factual: do not invent behaviour for a command or tool.

## Add a card

Append a new `---`-separated block at the end of the file. Order only affects `/remind list` and the count assertion in the quickcheck (see below); `/remind <n>` numbers are assigned automatically.

## Edit a card

Change the text only. The `# Title` line is what `/remind list` shows.

## Retire a card

Delete the whole block, then update the expected count in `extensions/reminder-card/tests/quickcheck.js`, which asserts exactly 7 cards today:

```js
check("cards.md yields exactly 7 cards", cards.length, 7);
```

## Verify

From the repo root (`/home/pcaro/.pi/agent`):

```bash
node extensions/reminder-card/tests/quickcheck.js
```

Expected: `PASS n/n`. Inside pi, `/remind` re-reads cards.md on every call, so no `/reload` is needed to preview; `/remind <n>` shows a specific card and `/remind list` shows the titles. Cards already rendered in a transcript keep their old text — the entry stores its own copy.
