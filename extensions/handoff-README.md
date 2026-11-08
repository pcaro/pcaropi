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

1. Gathers the current branch's messages (respects prior compactions —
   includes the compaction summary plus everything kept after it).
2. Asks the model to produce a self-contained handoff prompt (context +
   files + next task).
3. Opens the result in the editor for review.
4. Spawns a new session with `parentSession` set to the current one and
   pre-fills its editor with the prompt.

Requires interactive mode.

## Choosing models

By default the conversation is summarised by the **current session model**.
To pin an ordered list instead, add to `settings.json`:

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
- An unreadable session branch fails with a one-line message before any model
  is called.

## Long conversations

The conversation is capped at 120k characters, keeping the most recent tail
and marking the omitted portion, so a long session still fits the summarising
model instead of failing on every candidate.

## Origin

Copied from [pi-wares](https://github.com/fcatuhe/pi-wares/tree/main/extensions/handoff).
