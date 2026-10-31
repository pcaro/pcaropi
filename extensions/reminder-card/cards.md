# Plan before you code

Use /brain2wave for anything bigger than a quick fix: it clarifies the ask,
writes a plan and todos, branches off main and hands the work to subagents.

Quick edits stay in the main session. When a discussion deserves its own
thread, /tree jumps to any earlier point and continues from there.

---

# Delegate, don't grind

`subagent` sends bounded work to a scout (cheap recon), a worker (implementation
+ commit) and a reviewer (fresh eyes on the branch). One writer per repo,
workers sequentially.

The design conversation stays in the main session — that's what you're here for.

---

# Keep the context honest

/context shows what's actually loaded: tokens, skills, AGENTS.md, extensions.
/compact summarizes and frees the window. /branch forks a compressed child
session; /handoff starts a clean one with only the decisions.

/tree rewinds to any earlier point in the conversation and continues from there.

---

# Tools you forget you have

`codemode` runs a script that calls tools in parallel and returns only the
sliced result. `process` keeps a dev server or test watcher alive while you
keep working. `ask_user` asks you a structured question instead of guessing.

Background subagents wake the session when they finish — no polling.

---

# Evidence before assertions

pi-lens runs LSP diagnostics and linters on every file you touch; check
`lens_diagnostics` before calling a change clean. /review opens an interactive
review of a branch, a PR or the unstaged diff.

Don't claim "tests pass" without the output in hand.

---

# Cost, research, notes

/cost and /usage show what sessions actually burn, per model and per day.
`librarian` digs through GitHub with path and line citations; linkup covers the
live web.

/scratch keeps notes in a pad you can open in the browser; /prime and /end
carry context across a long session.

---

# Commits tell the story

Every commit goes through the `commit` skill: conventional subject under
72 chars, body explaining what changed and why.

No squash merges. Work stays on the feature branch with individual, readable
commits.
