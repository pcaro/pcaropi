# pcaropi

This repository contains skills, extensions, and themes for the Pi coding agent.

## Features

- **Skills**: Custom skills in `skills/`
- **Extensions**: Pi extensions in `pi-extensions/`
  - `answer.ts`: Interactive Q&A extension. Extract questions from assistant messages and answer them one by one.
- **Themes**: Custom themes in `pi-themes/`
- **Commands**: Custom prompt templates in `commands/`

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
