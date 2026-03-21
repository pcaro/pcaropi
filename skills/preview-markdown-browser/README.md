# Preview Markdown Browser Skill

Renders markdown content as styled HTML and opens it in the default browser.

## Origin

This skill was copied from [omaclaren/agent-skills-public](https://github.com/omaclaren/agent-skills-public/tree/main/skills/preview-browser-skill) on GitHub.

Original source: `https://github.com/omaclaren/agent-skills-public/blob/main/skills/preview-browser-skill/SKILL.md`

## Usage

Invoked explicitly (not auto-triggered). Can render either:
- A specified markdown file path as argument
- The last assistant message if no argument provided

The skill uses pandoc to convert markdown to HTML with a polished Inter font-based stylesheet, supporting code blocks, tables, lists, and annotation markers (`[an: ...]` → `<mark>`).

## Files

- `SKILL.md` — The skill definition file
- `README.md` — This file
