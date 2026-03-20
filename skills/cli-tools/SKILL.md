---
name: cli-tools
description: |
  CLI tools available: jq (JSON processing), fx (interactive JSON viewer), deep (structured data diff/patch), sqlite-utils (SQLite operations), gh (GitHub CLI), gw (git worktree manager), short (Shortcut stories), surf (browser automation), httpie (HTTP client), shot-scraper (web screenshots), flameshot (screenshots), rpl (search/replace), bq (BigQuery), snow (Snowflake), stern (Kubernetes logs)
---

# CLI Tools Reference

Quick reference for CLI tools available on Pablo's system. Use `--help` on any tool for full options.

## Data Processing

### jq - JSON Processor

```bash
jq [options] <jq filter> [file...]

Example:
  echo '{"foo": 0}' | jq .

Options:
  -n, --null-input        use `null` as the single input value
  -R, --raw-input         read each line as string instead of JSON
  -s, --slurp             read all inputs into an array
  -c, --compact-output    compact instead of pretty-printed output
  -r, --raw-output        output strings without escapes and quotes
  -S, --sort-keys         sort keys of each object on output
  -e, --exit-status       set exit status based on output
```

Documentation: https://jqlang.github.io/jq/

### fx - Interactive JSON Viewer

```bash
fx [flags] data.json

Flags:
  -h, --help       print help
  -v, --version    print version
  -r, --raw        treat input as a raw string
  -s, --slurp      read all inputs into an array
  --yaml           parse input as YAML
  --toml           parse input as TOML
  --strict         strict mode
```

See `references/fx.md` for built-in functions and advanced usage.
Documentation: https://fx.wtf

### deep - Structured Data Operations

```bash
deep [OPTIONS] COMMAND [ARGS]

Commands:
  diff     Deep diff for structured files
  extract  Extract data from structured files
  grep     Search in structured files
  patch    Apply patches to structured files
```

### sqlite-utils - SQLite Database Operations

```bash
sqlite-utils [OPTIONS] COMMAND [ARGS]

Commands:
  query         Execute SQL and return JSON results
  insert        Insert records into tables
  create-table  Create new tables
  tables        List tables in database
  analyze       Analyze database structure
  enable-fts    Enable full-text search
```

## GitHub & Git

### gh - GitHub CLI

```bash
gh <command> <subcommand> [flags]

Core commands:
  auth     Authenticate gh and git with GitHub
  browse   Open repos, issues, PRs in browser
  gist     Manage gists
  issue    Manage issues
  pr       Manage pull requests
  repo     Manage repositories
  run      View workflow runs
  workflow Manage workflows

Examples:
  gh pr create
  gh repo clone cli/cli
  gh pr checkout 321
```

Documentation: https://cli.github.com/manual

### gw - Git Worktree Helper

```bash
gw [command] [options]

Commands:
  create <name> [dir] [--stay]     Create worktree and cd to it
  review <name> [--stay]           Create worktree from existing branch
  rm <name> [--keep-branch]        Remove worktree
  cd [name]                        Navigate to worktree or repo root
  list                             List all worktrees
  clean                            Remove all worktrees
```

Load first: `source ~/.gw.sh`

## Project Management

### short - Shortcut CLI

```bash
short [options] [command]

Commands:
  search|s     Search stories
  story|st     View or manipulate stories
  create|c     Create a story
  members|m    List members
  workflows|wf List workflows
  epics|e      List epics
  projects|p   List projects
  api          Make API request

Examples:
  short search "API bug"
  short story 12345
```

## HTTP & Web

### surf - Browser Automation

```bash
surf <command> [args] [options]

Commands:
  go <url>          Navigate to URL
  read              Get page accessibility tree
  click <ref>       Click element
  type <text>       Type text
  screenshot        Capture screenshot
  locate.role       Find by ARIA role
  window.new        Create isolated browser window

Examples:
  surf go "https://example.com"
  surf read
  surf click e5
```

See `references/surf.md` for full command reference.

### httpie (http) - HTTP Client

```bash
http [METHOD] URL [REQUEST_ITEM ...]

Examples:
  http example.org                    # GET
  http example.org hello=world       # POST with JSON
  http POST example.org name=HTTPie  # Explicit POST

Request items:
  Header:     Referer:https://httpie.io
  Query:      search==httpie
  Data:       name=HTTPie
  JSON data:  amount:=42
  File:       cv@~/CV.pdf
```

See `references/httpie.md` for full options.

### shot-scraper - Web Screenshots

```bash
shot-scraper [OPTIONS] COMMAND [ARGS]

Commands:
  shot          Take screenshots
  accessibility Dump accessibility tree
  har           Record HAR file
  html          Output final HTML
  javascript    Execute JavaScript
  pdf           Create PDF of page
```

## Screen Capture

### flameshot - Screenshot Tool

```bash
flameshot [options] [arguments]

Arguments:
  gui     Start manual capture in GUI mode
  screen  Capture a single screen
  full    Capture entire desktop
  config  Configure flameshot

Examples:
  flameshot full -p ~/Pictures/
  flameshot gui
```

## Text Processing

### rpl - Search and Replace

```bash
rpl [options] OLD-TEXT NEW-TEXT [FILE ...]

Options:
  -i, --ignore-case    Case insensitive
  -w, --whole-words    Match whole words
  -R, --recursive      Search recursively
  -s, --dry-run        Simulation mode
  -b, --backup         Create backups (FILE~)
  -x GLOB              Only files matching glob
```

## Cloud Platforms

### bq - BigQuery CLI

```bash
bq [--global_flags] <command> [--command_flags] [args]

Key commands:
  query    Execute SQL queries

Options:
  --format   Output format (json|csv|pretty)
  --project  Project ID

Example:
  bq query 'SELECT count(*) FROM dataset.table'
```

### snow - Snowflake CLI

```bash
snow [OPTIONS] COMMAND [ARGS]

Commands:
  sql          Execute Snowflake query
  connection   Manage connections
  object       Manage Snowflake objects
  stage        Manage stages
  spcs         Manage Snowpark Container Services
```

## Kubernetes

### stern - Kubernetes Log Tailer

```bash
stern pod-query [flags]

Flags:
  -A, --all-namespaces    Tail across all namespaces
  -n, --namespace         Specific namespace
  -c, --container         Container name pattern
  -l, --selector          Label selector
  -s, --since             Logs newer than duration (default 48h)
  -t, --timestamps        Print timestamps
  --no-follow             Exit when logs finish
```

## Tool Selection Guide

| Task | Preferred Tool |
|------|---------------|
| JSON parsing/filtering | jq |
| JSON interactive exploration | fx |
| Structured data diff/patch | deep |
| SQLite operations | sqlite-utils |
| GitHub operations | gh |
| Multiple git branches | gw |
| Shortcut stories | short |
| Browser automation | surf |
| HTTP requests | httpie |
| Web screenshots | shot-scraper |
| Local screenshots | flameshot |
| Search/replace in files | rpl |
| BigQuery queries | bq |
| Snowflake operations | snow |
| Kubernetes logs | stern |