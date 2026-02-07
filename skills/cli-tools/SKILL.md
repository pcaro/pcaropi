---
name: cli-tools
description: Documents CLI tools available on Pablo's system - reference this when selecting tools for tasks involving JSON processing, screenshots, API testing, database queries, or file operations
---

# Available CLI Tools on Pablo's System

When working on Pablo's system, you have access to these specialized CLI tools. Prefer these tools when they match the task requirements.

## Data Processing & Manipulation

### jq - JSON Processing

**Use for**: Parsing, filtering, and transforming JSON data

```bash
# Tool for processing JSON inputs
jq [options] <jq filter> [file...]

# Example:
echo '{"foo": 0}' | jq .
```

**When to use**: Any JSON parsing, filtering, or transformation tasks. Prefer this over writing Python scripts for simple JSON operations.

Documentation: https://stedolan.github.io/jq

### fx - Interactive JSON Viewer & Transformer

**Use for**: Interactive JSON exploration, JavaScript-based JSON transformations, streaming JSON processing

```bash
# Interactive mode - explore JSON with keyboard navigation
fx data.json
cat data.json | fx

# Pretty print
echo '{"name": "world"}' | fx .

# Transform with JavaScript (reference input as 'x' or 'this')
fx data.json 'x.items.length'
fx data.json '.items.length'  # Shorthand with dot prefix

# Map over arrays - @ is shorthand for .map()
fx example.json @.title
fx data.json '@.name.toUpperCase()'

# Filter arrays - prefix with ?
fx example.json '?.size_bytes >= 1024'

# Flatten arrays - [] operator
fx data.json '.items[]'

# Modify objects with spread operator
echo '{"count": 1}' | fx '{...x, count: x.count + 1}'

# Process streaming JSON (line-delimited or concatenated)
cat stream.json | fx '.timestamp'
cat stream.json | fx --slurp 'x.length'  # Collect all into array

# Process non-JSON text line-by-line
cat file.txt | fx --raw 'x.toUpperCase()'
cat file.txt | fx --raw --slurp 'x.join("\n")'
```

**Built-in Functions**:

Array/Collection Operations:
- `len(x)` - Returns length of array, string, or object
- `uniq(x)` - Remove duplicates
- `sort(x)` - Sort array elements
- `sortBy(fn)(x)` - Sort with custom function (curried)
- `map(fn)(x)` - Transform elements (curried)
- `filter(fn)(x)` - Select matching elements
- `walk(fn)(x)` - Recursively transform nested structures
- `groupBy(fn)(x)` - Group array items (curried)
- `chunk(size)(x)` - Split into smaller arrays (curried)
- `flatten(x)` - Remove array nesting
- `reverse(x)` - Reverse array order

Object Operations:
- `keys(x)` - Extract property names
- `values(x)` - Extract property values

Data Conversion:
- `toBase64(x)` - Encode to base64
- `fromBase64(x)` - Decode base64
- `YAML.stringify(x)` - Convert JSON to YAML
- `YAML.parse(x)` - Parse YAML to JSON

I/O Functions:
- `list(x)` - Output array elements as lines
- `save(x)` - Edit input data in place

**Interactive Mode Features**:
- Navigate: Arrow keys or Vim keys (hjkl)
- Path adjustment: Press `.` to change paths
- Fuzzy search: Press `@`
- Regex search: Type `/pattern` (case-sensitive) or `/pattern/i` (case-insensitive)
- Print to stdout: Press `P`
- Help: Press `?` for key bindings

**Configuration**:
Create `.fxrc.js` in current directory, home directory, or XDG config directory to define custom reusable functions.

**Advanced Features**:
- Handles large numbers as BigInt (values > 2⁵³ - 1)
- Supports non-standard values: `Infinity`, `-Infinity`, `NaN`
- Comma operator for chaining operations on nested objects
- Supports JSON, YAML, and TOML formats

**When to use**:
- Interactive exploration of JSON data structures (prefer over jq for visual exploration)
- JavaScript-based transformations (when you need JS functions/methods)
- Streaming JSON processing
- Quick prototyping of JSON transformations with familiar JavaScript syntax
- In-place editing of JSON files with `save()` function

**When to prefer jq instead**:
- Complex multi-stage transformations (jq's pipeline model may be clearer)
- When you need jq-specific features (recursive descent, advanced path manipulation)
- Shell scripts where jq is already established

Documentation: https://fx.wtf

### deep - Structured Data Operations

**Use for**: Diffing, extracting, grepping, or patching structured files (CSV, TSV, JSON, YAML, TOML)

```bash
deep [OPTIONS] COMMAND [ARGS]

Commands:
  diff     - Deep diff for structured files
  extract  - Extract data from structured files
  grep     - Search in structured files
  patch    - Apply patches to structured files
```

**When to use**: When working with structured data formats beyond just JSON, especially for diffing configuration files or extracting specific fields.

### sqlite-utils - SQLite Database Operations

**Use for**: Creating, querying, and manipulating SQLite databases from command line

```bash
sqlite-utils [OPTIONS] COMMAND [ARGS]

Key commands:
  query        - Execute SQL and return JSON results
  insert       - Insert records into tables
  create-table - Create new tables
  analyze      - Analyze database structure
  enable-fts   - Enable full-text search
```

**When to use**: Quick database operations, converting data to/from SQLite, analyzing datasets.

## GitHub & Git Operations

### gh - GitHub CLI

**Use for**: All GitHub operations from command line

```bash
gh <command> <subcommand> [flags]

Core commands:
  pr        - Manage pull requests
  issue     - Manage issues
  repo      - Manage repositories
  auth      - Authenticate with GitHub
  api       - Make GitHub API requests

Examples:
  gh pr create
  gh repo clone cli/cli
  gh pr checkout 321
```

**When to use**: Creating PRs, managing issues, checking PR status, running GitHub API queries. Prefer this over manual web browsing for GitHub operations.

Documentation: https://cli.github.com/manual

### gw - Git Worktree Helper

**Use for**: Managing git worktrees for parallel branch work. Need to be loaded use source ~/.gw.sh first

```bash
gw [command] [options]

Commands:
  create <name> [directory] [--stay]  - Create worktree and cd to it
  review <name> [--stay]              - Create worktree from existing branch
  rm <name> [--keep-branch]           - Remove worktree (with confirmation)
  cd [name]                           - Navigate to worktree or repo root
  list                                - List all worktrees
  clean                               - Remove all worktrees (with confirmation)

Examples:
  gw create feature-x              # Create and switch to worktree
  gw create feature-x custom-dir   # Custom directory name
  gw create feature-x --stay       # Create without switching
  gw review feature/pr-123         # Review existing branch
  gw cd feature-x                  # Navigate to worktree
  gw cd                            # Navigate to repo root
  gw rm feature-x                  # Remove worktree and branch
  gw rm feature-x --keep-branch    # Remove worktree, keep branch
```

**When to use**: Working on multiple branches simultaneously, code review workflows, isolating experimental work. Worktrees allow multiple checkouts of the same repository without the overhead of cloning.

## Project Management

### short - Shortcut CLI

**Use for**: Viewing, creating, and updating Shortcut.com stories from command line

```bash
short [options] [command]

Core commands:
  search|s [options] [SEARCH]     - Search stories with optional query
  story|st [options]              - View or manipulate stories
  create|c [options]              - Create a story
  members|m [options]             - List members
  workflows|wf [options]          - List workflows and their states
  epics|e [options]               - List epics and their states
  projects|p [options]            - List projects and their states
  workspace|w [NAME] [options]    - List stories matching saved workspace query
  api <path> [options]            - Make a request to the Shortcut API

Examples:
  short search "API bug"          - Search for stories
  short story 12345               - View story details
  short create -n "Fix bug"       - Create new story
```

**When to use**: Reading story details for requirements, searching stories, creating stories from command line. Essential for converting Shortcut stories to REQ files.

Documentation: https://github.com/useshortcut/shortcut-cli

## HTTP & Web Operations

### httpie (http command)

**Use for**: Testing API endpoints, downloading web pages, making HTTP requests

```bash
http [METHOD] URL [REQUEST_ITEM ...]
```

**When to use**: API testing, downloading content, quick HTTP requests. More user-friendly than curl for interactive use.

### shot-scraper - Web Screenshots & Scraping

**Use for**: Taking screenshots of web pages, extracting accessibility trees, recording HAR files

```bash
shot-scraper [OPTIONS] COMMAND [ARGS]

Commands:
  shot          - Take screenshots
  accessibility - Dump accessibility tree
  har           - Record HAR file
  html          - Output final HTML
  javascript    - Execute JavaScript and return results
  multi         - Take multiple screenshots from YAML config
  pdf           - Create PDF of page
```

**When to use**: Automated screenshot capture, web scraping, testing web page rendering, capturing network traffic.

## Screen Capture

### flameshot - Screenshot Tool

**Use for**: Taking screenshots on Pablo's system

```bash
# Full screen capture
flameshot full [options]

Options:
  -p, --path <path>             - Save to directory or file
  -c, --clipboard               - Save to clipboard
  -d, --delay <milliseconds>    - Delay before capture
  --region <WxH+X+Y or string>  - Specific region
```

**When to use**: Any time screenshots are needed. Use `flameshot full` for full screen captures.

## Text Search & Replace

### rpl - Search and Replace in Files

**Use for**: Find and replace text across files

```bash
rpl [options] OLD-TEXT NEW-TEXT [FILE ...]

Key options:
  -i, --ignore-case    - Case insensitive search
  -w, --whole-words    - Match whole words only
  -R, --recursive      - Search recursively
  -x GLOB, --glob GLOB - Only modify files matching glob
  -s, --dry-run        - Simulation mode
  -b, --backup         - Create backups (FILE~)
```

**When to use**: Bulk text replacements across multiple files. Safer than sed for file modifications with --dry-run option.

## Cloud Platform Tools

### bq - BigQuery CLI

**Use for**: Interacting with Google BigQuery

```bash
bq [--global_flags] <command> [--command_flags] [args]

Key command:
  query - Execute SQL queries

Examples:
  bq query 'SELECT count(*) FROM publicdata:samples.shakespeare'
  echo 'SELECT ...' | bq query
```

**When to use**: BigQuery data analysis, running SQL queries against BigQuery datasets.

### snow - Snowflake CLI

**Use for**: Snowflake database operations

**When to use**: Interacting with Snowflake data warehouse.

## Kubernetes Operations

### stern - Kubernetes Log Tailing

**Use for**: Tailing logs from multiple pods/containers in Kubernetes

```bash
stern pod-query [flags]

Key flags:
  --all-namespaces        - Tail across all namespaces
  -n, --namespace string  - Specific namespace
  -c, --container string  - Container name pattern
  -l, --selector string   - Label selector
  -s, --since duration    - Logs newer than duration (default 48h)
  -e, --exclude strings   - Exclude log lines matching regex
  -i, --include strings   - Include only matching log lines
  -t, --timestamps        - Print timestamps
```

**When to use**: Debugging Kubernetes applications, monitoring pod logs, investigating issues across multiple containers.

## General Principles

1. **Prefer specialized tools**: When available, use domain-specific tools (jq/fx for JSON, gh for GitHub) rather than general-purpose tools
2. **Check dry-run options**: Tools like `rpl` have `--dry-run` flags - use them before making bulk changes
3. **Use pipes effectively**: Many of these tools work well in pipelines (e.g., `http api-endpoint | jq '.data'` or `cat data.json | fx @.id`)
4. **Leverage structured output**: Tools like `gh`, `bq`, and `sqlite-utils` can output JSON for further processing with `jq` or `fx`

## Tool Selection Priority

When multiple tools could work:

1. **Data format-specific tools first** (jq/fx for JSON, deep for structured data)
   - Use **fx** for: Interactive exploration, JavaScript-based transformations, rapid prototyping
   - Use **jq** for: Complex pipelines, shell scripts, jq-specific features
2. **Platform CLIs second** (gh for GitHub, bq for BigQuery)
3. **General-purpose tools last** (bash, python)

This ensures optimal performance and cleaner command syntax.
