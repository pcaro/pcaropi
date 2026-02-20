# pcaropi

This repository contains skills, extensions, and themes for the Pi coding agent.

## Features

### Skills

Custom skills located in `skills/`:

- **cli-tools**: Documents CLI tools available on Pablo's system (jq, fx, gh, etc.) - reference this when selecting tools for tasks involving JSON processing, screenshots, API testing, database queries, or file operations.
- **github**: Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries.
- **google-workspace**: Access Google Workspace APIs (Drive, Docs, Calendar, Gmail, Sheets, Slides, Chat, People) via local helper scripts without MCP. Handles OAuth login and direct API calls.
- **update-changelog**: Read this skill before updating changelogs.
- **web-browser**: Allows to interact with web pages by performing actions such as clicking buttons, filling out forms, and navigating links using Chrome DevTools Protocol.

### Extensions

Pi extensions located in `pi-extensions/`:
  - `answer.ts`: Interactive Q&A extension. Extract questions from assistant messages and answer them one by one.

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

## Development

1.  Clone the repo.
2.  Run `npm install`.
3.  Make changes to extensions or skills.
4.  Test by installing the local path: `pi install .` (in the repo root).

## License

ISC
