# Tool Usage Guidelines

- Create files with `write`, not echo/heredoc.
- Reserve `bash` for what needs a real shell (git, builds, package managers, ssh, curl, processes). Text search is `rg` in `bash` — there is no standalone `grep`/`find` tool in this setup.
- Batch independent tool calls with `codemode`: run them in parallel and slice/filter large output before it reaches context — only the script's output reaches the model.
