# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-02-27
### Added
- **Skills**:
  - `show-me`: Record kitty proof sessions demonstrating completed work.
  - `summarize`: Convert URL/local file to Markdown using `markitdown` and optionally summarize.
  - `google-workspace`: Access Google Workspace APIs via local scripts.
  - `cli-tools`: Document and recommend CLI tools for JSON, github, db queries, etc.
  - `update-changelog`: Guidelines for updating changelogs.
- **Extensions**:
  - `context`: Visualize current context usage (tokens, cost, files).
  - `session-breakdown`: Visualize session history over time.
  - `uv`: Intercept Python commands (`pip`, `poetry`) and suggest `uv` equivalents.
- **Commands**:
  - Added PR workflow commands and code review commands.
- **Docs**:
  - Updated README to document all extensions and skills.
  - Enforced Agent Skills specification for new skills in `AGENT.md`.

## [1.0.0] - 2025-06-03
- Initial release.
