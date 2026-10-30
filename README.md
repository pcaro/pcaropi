# Pi Config

My personal pi configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, APPEND_SYSTEM.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi, plus gh (private skills repo) and gitleaks (commit hook)

# 2. Let gh drive git over HTTPS — no SSH key required
gh auth login
gh auth setup-git

# 3. Clone config and shared skills
mkdir -p ~/.pi
git clone https://github.com/pcaro/pcaropi ~/.pi/agent
git clone https://github.com/pcaro/agent-skills ~/.agents

# 4. Enable the commit hook — core.hooksPath is local git config, it does not clone
cd ~/.pi/agent && git config core.hooksPath .githooks

# 5. Install the packages declared in settings.json
pi update --extensions

# 6. Credentials: run /login inside pi, one per provider you use
pi          # then /login anthropic, /login openrouter, ...
```

`mcp.json` is machine-local and is not cloned; recreate it as described in [MCP servers](#mcp-servers).

### Updating

```bash
cd ~/.pi/agent && git pull
```

### MCP servers

`mcp.json` is not versioned: it is machine-specific and depends on environment variables. To rebuild it:

```bash
export LINKUP_API_KEY=...   # https://app.linkup.so

pi mcp add linkup --url https://mcp.linkup.so/mcp \
  --bearer-token-env-var LINKUP_API_KEY \
  --description "Linkup web search, fetch/scrape, and long-running research over the live web"
```

The key travels as an `Authorization: Bearer ${LINKUP_API_KEY}` header, never in the URL. The tools show up as `mcp__linkup__linkup_search`, `..._fetch`, `..._research` and `..._get_research`; usage details live in the [**linkup-mcp**](skills/linkup-mcp/SKILL.md) skill.

---

## Skills

Only the skills shaped around pi's own tools live here. Everything agent-agnostic
(Python tooling, git, writing, design, CLIs) moved to
[`pcaro/agent-skills`](https://github.com/pcaro/agent-skills), which installs to
`~/.agents/skills` — a path both pi and opencode read natively.

| Skill                                   | When to use                                                                                         | Tools / Scripts                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **linkup-mcp**                          | Calling Linkup over MCP: underscore tool names, response shape, codemode to avoid blowing up context, when to fall back to REST | `linkup_search`, `linkup_fetch`, `linkup_research`        |
| **session-reader**                      | Reading and analyzing pi session .jsonl files                                                        | bash, read                                                |
| **subagent-delegation**                 | Deciding when to delegate bounded work to subagents and which model to use (downshift/upshift)       | `pi --list-models`, `subagent`, `TaskExecute`             |

#### Quick Reference

> Note: these skills live in `~/.agents` (repo [`pcaro/agent-skills`](https://github.com/pcaro/agent-skills)), not in `skills/`.

- **Python code**: Always use `uv` + `ruff` + `ty` (package manager, linter, type checker)
- **Commits**: Always use `commit` before any commit
- **Demos**: Use `show-me` to prove the code works
- **Data extraction**: Use `summarize` for docs, `cli-tools` for JSON
- **GitHub**: Use `github` for PRs, issues, CI
- **Web**: Use `web-browser` for browser automation
- **Google Workspace**: Use `google-workspace` for Drive/Docs/Calendar
- **Planning**: Use `/brain2wave` (Brain2Wave: idea → plan → branch → code with subagents) before large changes; it loads the `brainstorm` skill
- **Frontend**: Use `frontend-design` for web components/interfaces
- **New code**: Use `learn-codebase` to explore unfamiliar projects
- **Refactor**: Use `code-simplifier` to clean up and simplify code
- **Presentations**: Use `presentation-creator` for data slides

## Extensions

### Internal (auto-discovered from `extensions/`)

Every extension in `extensions/` loads automatically. `uv-with-cwd.ts` is loaded explicitly via settings because it replaces the `bash` tool:

#### Session and context

| Extension                                                | Command(s)           | What it does                                                                                                                  |
| -------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [**context**](extensions/context.ts)                     | `/context`           | Shows the loaded context: tokens, skills, AGENTS.md, extensions, prompts and session files.                                   |
| [**session-breakdown**](extensions/session-breakdown.ts) | `/session-breakdown` | Interactive history breakdown (7/30/90 days): sessions, messages, tokens and cost per model with an inline chart.             |
| [**branch**](extensions/branch.ts)                       | `/branch`            | Summarizes the conversation and starts a new child branch with the compressed context.                                        |
|                                                          | `/compress`          | Summarizes the whole session and creates a new session (the original is preserved).                                           |
|                                                          | `/branches`          | Shows the branch summary tree with size and preview.                                                                           |
| [**handoff**](extensions/handoff.ts)                     | `/handoff`           | Transfers context to a new session: the LLM extracts decisions, files and key findings to generate a starting prompt.         |
| [**answer**](extensions/answer.ts)                       | `/answer`            | Interactive Q&A. Extracts questions from the assistant message and answers them one by one via native UI (`Ctrl+.`).          |
| [**structured-prompt**](extensions/structured-prompt/)   | `/prompt`<br>`Ctrl+Alt+P` | Structured form to compose prompts in sections (Goal, Task, Context, Criteria, Constraints, Work order). Copied from [n-r-w/pi-agent-suite](https://github.com/n-r-w/pi-agent-suite). |

#### Code and files

| Extension                              | Command(s)  | What it does                                                                                                                   |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [**review**](extensions/review.ts)     | `/review`   | Interactive code review. Supports GitHub PRs, branches, commits, unstaged changes and custom instructions.                    |
| [**todos**](extensions/todos.ts)       | `/todos`    | Markdown TODO manager with file backing. Create, claim, update and close tasks with locking and a TUI.                         |
| [**watchdog**](extensions/watchdog.ts) | `/watchdog` | Session monitor. Uses Haiku as judge to detect whether the agent is stuck, looping or needs intervention.                     |

#### Terminal and desktop

| Extension                                                | Command(s)     | What it does                                                                                     |
| -------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| [**notify**](extensions/notify.ts)                       | _(automatic)_  | Desktop notifications when the agent finishes a turn: `notify-send` on Linux, `osascript` on macOS. |
| [**herdr-agent-state**](extensions/herdr-agent-state.ts) | _(automatic)_  | Reports pi state (working/blocked/idle) to herdr over a unix socket for pane tracking.           |

#### Agent system

| Extension                                              | Command(s)        | What it does                                                                                                                    |
| ------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [**execute-command**](extensions/execute-command.ts)   | _(internal tool)_ | Registers `execute_command` so the agent can invoke slash commands itself (`/answer`, `/reload`, etc.) or send itself messages. |
| [**get-current-time**](extensions/get-current-time.ts) | _(internal tool)_ | Registers `get_current_time` so the agent can look up the current date/time.                                                    |
| [**uv-with-cwd**](extensions/uv-with-cwd.ts)           | _(internal tool)_ | Replaces the `bash` tool: adds a `cwd` parameter and intercepts `python`/`pip`/`poetry` (via `intercepted-commands/`) to force `uv`. |

#### Metrics

| Extension                              | Command(s)      | What it does                                                                                                               |
| -------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [**cost**](extensions/cost.ts)         | `/cost [days]`  | API cost summary (7 days by default) extracted from session .jsonl files.                                                   |
| [**usage**](extensions/usage/)         | `/usage`        | Usage stats dashboard. Cycles Today / This Week / All time. Cost, tokens and messages per provider and model.              |

#### Security

| Extension                                         | Command(s)    | What it does                                                                                                    |
| ------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| [**dirty-repo-guard**](extensions/dirty-repo-guard/index.ts) | _(automatic)_ | Blocks session switches when the repo has uncommitted changes. Asks before switch/fork with a dirty working directory. |
| [**guardrails.json**](extensions/guardrails.json) | _(config)_    | File protection policies for `@aliou/pi-guardrails`: blocks `.env`, private keys, etc.                          |

### External (installed as npm/git packages)

#### User interface

| Package                                                                      | Repo                | What it does                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [**pi-powerline-footer**](https://github.com/nicobailon/pi-powerline-footer) | GitHub (nicobailon) | Powerline status bar in the TUI. Logo, model, shortcuts, loaded skills/extensions, context (70%/90% alerts), recent sessions, stash and /vibe themes.       |
| [**pi-markdown-preview**](https://github.com/omaclaren/pi-markdown-preview)  | GitHub (omaclaren)  | Previews responses and Markdown/LaTeX/code/diff files in the terminal (PNG), browser or PDF. With math, Mermaid and themes.                                  |
| [**@tmustier/pi-tab-status**](https://github.com/tmustier/pi-extensions)     | GitHub (tmustier)   | Terminal tab indicators for parallel sessions: ✅ done, 🚧 stuck, 🛑 timed out.                                                                              |

#### Delegation and agents

| Package                                                                        | Repo                | What it does                                                                                                         |
| ------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [**pi-subagents**](https://github.com/nicobailon/pi-subagents)                 | GitHub (nicobailon) | Subagent delegation (scout, worker, reviewer, planner, oracle). Chains, parallel, foreground/background.             |
| [**pi-intercom**](https://github.com/nicobailon/pi-intercom)                   | GitHub (nicobailon) | Direct 1:1 messaging between Pi sessions on the same machine. `intercom` tool + `/intercom` overlay.                 |

#### Session and prompts

| Package                                                                                           | Repo                     | What it does                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [**pi-invisible-continue**](https://github.com/monotykamary/pi-invisible-continue)                | GitHub (monotykamary)    | `/continue` resumes the agent loop without the LLM seeing a new prompt. No context contamination.                                  |
| [**pi-edit-session-in-place**](https://www.npmjs.com/package/pi-edit-session-in-place)            | npm                      | Re-edits or deletes earlier user messages in the current session branch.                                                             |
| [**pi-copy-user-message**](https://www.npmjs.com/package/pi-copy-user-message)                    | npm                      | `/copy-user` copies the most recent user message to the clipboard.                                                                   |
| [**pi-slim**](https://www.npmjs.com/package/pi-slim)                                              | npm                      | Slims down the default system prompt. Pi documentation becomes opt-in via `/pi`.                                                     |
| [**@howaboua/pi-auto-trees**](https://github.com/IgorWarzocha/howaboua-pi-stuff/tree/main/packages/pi-auto-trees) | GitHub (IgorWarzocha) | Incremental flow for long sessions: `/marker` sets a checkpoint, `/end` summarizes the work done, returns to the marker and moves on. Keeps useful context, drops implementation noise. Modes: `git`, `full`, custom prompt. |

#### Security and control

| Package                                                            | Repo           | What it does                                                                                                    |
| ------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------- |
| [**@aliou/pi-guardrails**](https://github.com/aliou/pi-guardrails) | GitHub (aliou) | Protects sensitive files (`.env`, keys), blocks dangerous commands, controls access to paths outside the workspace. |
| [**pi-inspect**](https://www.npmjs.com/package/pi-inspect)         | npm            | Inspects what Pi has loaded (prompts, guidelines, tools, skills) without rediscovery.                           |

#### MCP and external connectivity

Native MCP servers are not packages: the ones configured today are `linkup` (active, documented in [MCP servers](#mcp-servers)) and `teams` (Teams MCP, disabled).

| Package                                                                                        | Repo                | What it does                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| [**@matheusbbarni/pi-stitch-mcp**](https://www.npmjs.com/package/@matheusbbarni/pi-stitch-mcp) | npm                 | Stitch MCP integration: connection status, listing/reading resources and prompts from MCP servers.   |
| [**chrome-cdp-skill**](https://github.com/pasky/chrome-cdp-skill)                              | GitHub (pasky)      | Inspect/debug local Chrome over CDP (only with explicit approval).                                   |
| [**pi-add-dir**](https://github.com/itisbryan/pi-add-dir)                                      | GitHub (itisbryan)  | Adds external directories to the session, loading their AGENTS.md and skills.                        |

#### Processes and automation

| Package                                                                                | Repo                | What it does                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| [**@aliou/pi-processes**](https://github.com/aliou/pi-processes)                       | GitHub (aliou)      | Background process management. Starts servers, test watchers and builds without blocking the conversation.   |
| [**pi-schedule-prompt**](https://github.com/tintinweb/pi-schedule-prompt)              | GitHub (tintinweb)  | Schedules recurring prompts with cron syntax. `/schedule-prompt` command.                                     |
| [**pi-prompt-template-model**](https://github.com/nicobailon/pi-prompt-template-model) | GitHub (nicobailon) | Adds model/skill/thinking frontmatter to prompt templates. Each template is a self-contained agent mode.       |

#### Code analysis

| Package                                                                    | Repo               | What it does                                                                                                  |
| -------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| [**pi-lens**](https://github.com/apmantza/pi-lens)                         | GitHub (apmantza)  | Real-time code feedback: LSP, linters, formatters, type checking, ast-grep.                                   |
| [**pi-token-burden**](https://github.com/Whamp/pi-token-burden)            | GitHub (Whamp)     | System prompt token budget breakdown via `/token-burden`. Preferred over `pi-context-usage` (similar mission). |
| [**@tmustier/pi-code-actions**](https://github.com/tmustier/pi-extensions) | GitHub (tmustier)  | Selects code blocks from assistant messages to copy, insert or run with `/code`.                              |
| [**ponytail**](https://github.com/DietrichGebert/ponytail)                 | GitHub (DietrichGebert) | Lazy senior mode: the smallest change that solves the task, and a reply you understand in one read. Ships the `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain` and `ponytail-help` skills. |

#### Agent system

| Package                                                                           | Repo                     | What it does                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| [**pi-codex-goal**](https://www.npmjs.com/package/pi-codex-goal)                  | npm                      | Codex-style goal tracking: `get_goal`, `create_goal`, `update_goal` for long-running sessions.       |
| [**pi-cache-optimizer**](https://www.npmjs.com/package/pi-cache-optimizer)       | npm                      | Improves prompt/KV cache hit rates with stable keys and footer stats.                               |
| [**@fyeeme/pi-session-name**](https://github.com/fyeeme/pi-packages)            | GitHub (fyeeme)          | AI-names sessions (follow/first/auto modes), `/rename`, and never overwrites a hand-picked name.    |
| [**pi-claude-bridge**](https://github.com/elidickinson/pi-claude-bridge)          | GitHub (elidickinson)    | Bridge to Claude Code (Agent SDK): `claude-bridge/*` models in `/model` and the `AskClaude` tool.   |

#### Providers and models

| Package                                                                                        | Repo               | What it does                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**pi-provider-opencode-console**](https://github.com/grikomsn/pi-provider-opencode-console)   | GitHub (grikomsn)  | `opencode-console` and `opencode-go-console` providers with device-code OAuth login and per-organization model discovery. It is this config's `defaultProvider` (`opencode-go-console`, model `deepseek-v4.1-flash`). |

#### Utilities

| Package                                                                      | Repo                  | What it does                                                                                                               |
| ---------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [**pi-head**](https://github.com/omerxx/pi-head)                             | GitHub (omerxx)       | One-line summary when you refocus the terminal after inactivity. Helps with multiple sessions.                            |
| [**pi-context-prune**](https://github.com/championswimmer/pi-context-prune)  | GitHub (championswimmer) | Summarizes batches of completed tool calls and prunes the raw outputs from future context. Recoverable via `context_tree_query`. |
| [**pi-ask-user**](https://github.com/nicobailon/pi-ask-user)                 | GitHub (nicobailon)   | `ask_user` tool for structured questions to the agent with an interactive overlay, multiple options and free-form input.  |
| [**@ogulcancelik/pi-sketch**](https://github.com/ogulcancelik/pi-extensions) | GitHub (ogulcancelik) | Drawing and sketching from Pi in the terminal.                                                                             |
| [**@diegopetrucci/pi-librarian**](https://www.npmjs.com/package/@diegopetrucci/pi-librarian) | npm | GitHub research with a local repo cache. Web search with evidence and code citations.                                     |
| [**@badliveware/pi-pr-upstream-status**](https://www.npmjs.com/package/@badliveware/pi-pr-upstream-status) | npm | Shows the upstream PR status of the current branch (open, merged, closed).                                                |
| [**@mazli/pi-worktree**](https://github.com/HamdiMaz/Worktree)                   | GitHub (HamdiMaz)      | Creates and manages git worktrees from Pi. `/worktree <branch>` opens an isolated session in `.worktrees/`, creating the branch and copying `.pi` resources automatically. |
| [**@nikiforovall/pi-scratchpad**](https://github.com/NikiforovAll/scratchpad) | GitHub (NikiforovAll) | Per-session scratchpad on top of the `scratch` CLI: `scratch` and `planning-with-scratchpad` skills, plus `/scratch ui/export/stop` for the read-only viewer. |
| [**@miclivs/pi-charts**](https://www.npmjs.com/package/@miclivs/pi-charts) | npm | Renders ECharts charts to inline PNG: `chart_schema` and `render_chart` tools (bar, line, pie, scatter, radar, funnel, gauge, treemap, boxplot, heatmap, candlestick, sankey). |

## Scripts

Own scripts in `scripts/`. No dependencies, ESM, `node:` builtins only.

| Script       | What it does                                              |
| ------------ | --------------------------------------------------------- |
| **pi-usage** | Cost, tokens and turns from `sessions/` by project, model and day. |

Usage: `node scripts/pi-usage/cli.js ~/.pi/agent/sessions --top 5`, with `--json` for raw data. Modules `parse` → `aggregate` → `render` → `cli` with frozen contracts, and tests in `scripts/pi-usage/tests/quickcheck.js`.

Note: the source JSONL files contain negative price corrections (two files add up to −$119k), so the total can come out negative. It is propagated as-is, not clamped.

## Workflows

`workflows/wave.js` — parallel wave runner for [pi-subagents](https://github.com/nicobailon/pi-subagents): a ready queue over a task graph read from a plan, one retry per task with the error in the prompt, skip propagation to dependents, and a fresh final review.

```js
subagent({
  workflow: "./workflows/wave.js",
  cwd: "/home/pcaro/.pi/agent",
  args: {
    plan: "~/.pi/history/<project>/plans/<plan>.md",
    tasks: [{ id: "T1", agent: "worker", files: "path/to.js", deps: [] }],
    review: { agent: "reviewer", model: "opencode/claude-haiku-5-5", timeoutMs: 180000 },
  },
})
```

Validate before launching: `subagent({ action: "validate", workflow: "./workflows/wave.js" })`.

The child does not receive the task text, only the plan path and its id: each one reads its own block, and the plan is the single source of truth. `model` and `timeoutMs` are pass-through — the script never picks a model. `workflows/*.json` remains runtime state and is not versioned.

## Themes

Custom themes located in `themes/` (currently `notte.json`).

## Commands

Custom prompt templates located in `prompts/` (`brain2wave`, `conjetura`, `critica`, `listo`, `pr-arregla`, `pr-crea`, `revisa-sesion`).

`/brain2wave` is the **Brain2Wave** command: it loads the `brainstorm` skill and runs the full chain — idea → clarify → plan → todos → `feat/...` branch → subagent execution (scout → workers → reviewer).

---

This config uses subagents (folder `agents/`) via [pi-subagents](https://github.com/nicobailon/pi-subagents), plus custom main-agent modes in `main-agents/` (`ask`, `design`, `fast`, `nico`, `plan`, `raw`).
