# pcaropi

This repository contains skills, extensions, and themes for the Pi coding agent.

## Features

### Skills

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

### Extensions

Pi extensions located in `pi-extensions/`:

- **answer** (`answer.ts`): Interactive Q&A extension. Extract questions from assistant messages and answer them one by one (`/answer` or `Ctrl+.`).
- **context** (`context.ts`): Visualize current context usage (tokens, cost, loaded files/skills) via `/context`.
- **files** (`files.ts`): Interactive file browser (`/files` or `Ctrl+Shift+o`) with git status, quick look (`Ctrl+Shift+r`), and finder reveal (`Ctrl+Shift+f`).
- **notify** (`notify.ts`): Sends desktop notifications (Linux/`notify-send`) when the agent completes a turn.
- **session-breakdown** (`session-breakdown.ts`): Visualize session history (tokens/cost/messages) over 7/30/90 days via `/session-breakdown`.
- **todos** (`todos.ts`): Full-featured Markdown-based TODO manager (`/todos`). Supports listing, creating, claiming, and updating tasks with file locking and TUI.
- **uv** (`uv.ts`): Intercepts Python commands (`pip`, `poetry`) to suggest or redirect to `uv` equivalents for faster package management.

### Themes

Custom themes located in `pi-themes/`.

### Commands

Custom prompt templates located in `commands/`.

## Installation

You can install this package directly from GitHub or npm (once published).

### Using `pi` CLI

Install globally:

```bash
pi install git:github.com/pcaro/pcaropi
```

Or install for a specific project (saves to `.pi/settings.json`):

```bash
pi install -l git:github.com/pcaro/pcaropi
```

### Manual Installation

Clone the repository and install it as a local package:

```bash
git clone https://github.com/pcaro/pcaropi.git
pi install ./pcaropi
```

## Usage

### Interactive Q&A (`answer`)

The `answer` extension helps you systematically answer multiple questions from the assistant.

1.  When the assistant asks multiple questions, run the `/answer` command or use `Ctrl+.` shortcut.
2.  Pi will extract the questions and present an interactive form.
3.  Fill in your answers and submit.
4.  The answers are sent back to the assistant as a single structured message.

### TODO Manager (`todos`)

The `todos` extension provides a full-featured markdown-based task manager.

1.  Run `/todos` to open the interactive TUI.
2.  Use arrow keys to navigate tasks.
3.  Press `Enter` to see actions (work, refine, close, etc.).
4.  Use `Ctrl+Shift+w` to quickly "work" on a task (loads it into context).
5.  Use `Ctrl+Shift+r` to "refine" a task (starts a refinement chat).

### File Browser (`files`)

The `files` extension lets you browse and manage files without leaving `pi`.

1.  Run `/files` or press `Ctrl+Shift+o` to open the file browser.
2.  It shows files in the current git tree and files referenced in the session.
3.  Filter by typing.
4.  Actions include: Reveal in Finder, Open, Quick Look (`Ctrl+Shift+r`), Edit, Add to prompt.

## Development

1.  Clone the repo.
2.  Run `npm install`.
3.  Make changes to extensions or skills.
4.  Test by installing the local path: `pi install .` (in the repo root).

## License

ISC
