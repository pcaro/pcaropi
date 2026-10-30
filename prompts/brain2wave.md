---
description: Brain2Wave — idea → plan → branch → code with subagents (loads the brainstorm skill)
skill: brainstorm
---

# Brain2Wave

Start the **Brain2Wave** workflow: a structured brainstorming session that takes an idea all the way to executed and reviewed code.

Follow the `brainstorm` skill end to end. Do not skip any phase unless the user explicitly asks you to:

1. Announce the session: "Starting a brainstorming session…".
2. Investigate the repo context before asking questions.
3. Clarify requirements (`ask_user`, one topic at a time).
4. Propose 2-3 approaches with your recommendation.
5. Validate the design section by section.
6. Write the plan to `~/.pi/history/<project>/plans/`.
7. Create todos (2-6 minute band) and run plan lint.
8. Create the `feat/...` branch.
9. Execute with subagents: scout → workers (sequential) → reviewer.

**Goal:** $ARGUMENTS
