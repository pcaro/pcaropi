# Pi Config

My personal pi configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi (https://github.com/badlogic/pi)

# 2. Clone this repo as your agent config
mkdir -p ~/.pi
git clone git@github.com:HazAT/pi-config ~/.pi/agent

# 3. Run setup (installs packages + extension deps)
cd ~/.pi/agent && ./setup.sh

# 4. Add your API keys to ~/.pi/agent/auth.json

# 5. Restart pi
```

### Updating

```bash
cd ~/.pi/agent && git pull
```

---

## Skills

Custom skills located in `skills/`:

| Skill | When to use | Tools | Scripts/Files |
|-------|-------------|-------|---------------|
| **[show-me](skills/show-me/README.md)** | Prove that code works — run demos, record terminal sessions | Bash, Read | `scripts/kitty_screenshot.sh`, `scripts/wait_for_text.sh` |
| **summarize** | Convert URL/PDF/DOCX to Markdown, summarize content | Bash, Read | `to-markdown.mjs` |
| **google-workspace** | Access Drive, Docs, Calendar, Gmail, Sheets without MCP | Bash | `scripts/auth.js`, `scripts/workspace.js` |
| **github** | Interact with GitHub — PRs, issues, CI runs, API queries | Bash | `gh` CLI |
| **web-browser** | Interact with web pages — click, fill forms, navigate | Bash | `scripts/*.js` (CDP) |
| **cli-tools** | Reference for selecting tools — jq, fx, gh, sqlite-utils, etc. | (reference only) | — |
| **update-changelog** | Update CHANGELOG.md before releases | (reference only) | — |
| **brainstorming-requirement** | Refine ideas into designs through structured questioning | ask_user, write | — |

#### Quick Reference

- **Recording demos**: Use `show-me` to prove code works
- **Data extraction**: Use `summarize` for docs, `cli-tools` for JSON
- **GitHub ops**: Use `github` for PRs, issues, CI
- **Web automation**: Use `web-browser` for browser interaction
- **Google Workspace**: Use `google-workspace` for Drive/Docs/Calendar
- **Requirements**: Use `brainstorming-requirement` before coding

## Extensions

Pi extensions located in `pi-extensions/`:

- **answer** (`answer.ts`): Interactive Q&A extension. Extract questions from assistant messages and answer them one by one (`/answer` or `Ctrl+.`).
- **context** (`context.ts`): Visualize current context usage (tokens, cost, loaded files/skills) via `/context`.
- **files** (`files.ts`): Interactive file browser (`/files` or `Ctrl+Shift+o`) with git status, quick look (`Ctrl+Shift+r`), and finder reveal (`Ctrl+Shift+f`).
- **notify** (`notify.ts`): Sends desktop notifications (Linux/`notify-send`) when the agent completes a turn.
- **session-breakdown** (`session-breakdown.ts`): Visualize session history (tokens/cost/messages) over 7/30/90 days via `/session-breakdown`.
- **todos** (`todos.ts`): Full-featured Markdown-based TODO manager (`/todos`). Supports listing, creating, claiming, and updating tasks with file locking and TUI.
- **uv** (`uv.ts`): Intercepts Python commands (`pip`, `poetry`) to suggest or redirect to `uv` equivalents for faster package management.

## Themes

Custom themes located in `pi-themes/`.

## Commands

Custom prompt templates located in `commands/`.

---

This config uses subagents (folder `agents`) using [pi-subagents](https://github.com/badlogic/pi-subagents).
