# handoff

Transfer context to a new focused pi session via `/handoff <goal>`.

Unlike `/compact` (lossy, same session), `/handoff` uses the LLM to extract
what matters for your next task — decisions made, files touched, key
findings — and starts a **new session** (linked to the current one as a
parent) pre-filled with a focused prompt you can review/edit before
submitting.

## Usage

```
/handoff now implement this for teams as well
/handoff execute phase one of the plan
/handoff check other places that need this fix
```

Flow:

1. Gathers the current branch within the chosen model's token budget
   (respects prior compactions — the compaction summary counts as context).
2. Asks the model to produce a self-contained handoff prompt (context +
   files + next task).
3. Opens the result in the editor for review.
4. Spawns a new session with `parentSession` set to the current one and
   pre-fills its editor with the prompt.

Requires interactive mode.

## Choosing models

With no `handoff.models` list, the **current session model** does the
summarising. To pin an ordered list instead, add to `settings.json`:

```json
"handoff": {
  "models": [
    "claude-bridge/claude-sonnet-5-5",
    "opencode-go-console/deepseek-v4.1-flash"
  ]
}
```

Each entry is `provider/id` or a bare id. Candidates are tried in the listed
order, then the session model as a last resort, so the list is a preference
and never a hard requirement. Specs that no longer match a model, or whose
provider has no credentials configured, are skipped silently.

## What gets sent

The branch is selected by pi's own `prepareBranchEntries()`, the same budget
logic `/compact` uses: `model.contextWindow - 16384` tokens, newest entries
first, compaction and branch summaries counted as context, `context_edit`
entries honored, and tool results skipped (the assistant's tool call already
carries the intent). Tool calls also produce a `## Files touched` section, so
the draft's file list comes from what pi actually read and modified instead
of the model guessing.

The budget is per candidate, so a 200k-window model gets more history than a
128k one. If not even the newest message fits, `/handoff` says so before
calling any model instead of sending an empty conversation.

## Failure behaviour

`/handoff` never dumps a stack trace into the session:

- A model that throws, returns `stopReason: "error"` or comes back empty is
  recorded and the next candidate is tried.
- If every candidate fails, one notification names each model with the first
  line of its error, capped in length:
  `Handoff failed — claude-bridge/claude-sonnet-5-5: 401 … | opencode-go-console/deepseek-v4.1-flash: quota exhausted`
- Aborting the spinner reports `Cancelled` and is never treated as an error.
- A draft that stopped at the model's output limit (`stopReason: "length"`)
  still opens, with a warning that it may be truncated.
- An unreadable or empty branch fails with a one-line message before any model
  is called.

## Draft size

The system prompt asks for a draft under 6000 characters. If a model ignores
that and returns more than 8000, one extra call on the same model compresses
it (decisions, paths, symbols and the task preserved). If that pass fails, the
long draft is kept: a verbose handoff beats no handoff.

## Origin

Copied from [pi-wares](https://github.com/fcatuhe/pi-wares/tree/main/extensions/handoff).
