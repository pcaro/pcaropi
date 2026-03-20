# fx - Interactive JSON Viewer & Transformer

Reference: https://fx.wtf

## Installation

```bash
npm install -g fx
```

## Core Usage

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

## Built-in Functions

### Array/Collection Operations

| Function | Description |
|----------|-------------|
| `len(x)` | Length of array, string, or object |
| `uniq(x)` | Remove duplicates |
| `sort(x)` | Sort array elements |
| `sortBy(fn)(x)` | Sort with custom function (curried) |
| `map(fn)(x)` | Transform elements (curried) |
| `filter(fn)(x)` | Select matching elements |
| `walk(fn)(x)` | Recursively transform nested structures |
| `groupBy(fn)(x)` | Group array items (curried) |
| `chunk(size)(x)` | Split into smaller arrays (curried) |
| `flatten(x)` | Remove array nesting |
| `reverse(x)` | Reverse array order |

### Object Operations

| Function | Description |
|----------|-------------|
| `keys(x)` | Extract property names |
| `values(x)` | Extract property values |

### Data Conversion

| Function | Description |
|----------|-------------|
| `toBase64(x)` | Encode to base64 |
| `fromBase64(x)` | Decode base64 |
| `YAML.stringify(x)` | Convert JSON to YAML |
| `YAML.parse(x)` | Parse YAML to JSON |

### I/O Functions

| Function | Description |
|----------|-------------|
| `list(x)` | Output array elements as lines |
| `save(x)` | Edit input data in place |

## Interactive Mode

| Key | Action |
|-----|--------|
| Arrow keys / hjkl | Navigate |
| `.` | Change paths |
| `@` | Fuzzy search |
| `/pattern` | Regex search (case-sensitive) |
| `/pattern/i` | Regex search (case-insensitive) |
| `P` | Print to stdout |
| `?` | Show key bindings |

## Flags

| Flag | Description |
|------|-------------|
| `-h, --help` | Print help |
| `-v, --version` | Print version |
| `-r, --raw` | Treat input as raw string |
| `-s, --slurp` | Read all inputs into array |
| `--yaml` | Parse input as YAML |
| `--toml` | Parse input as TOML |
| `--strict` | Strict mode |
| `--no-inline` | Disable inlining in output |

## Configuration

Create `.fxrc.js` in current directory, home directory, or XDG config directory to define custom reusable functions.

## Advanced Features

- Handles large numbers as BigInt (values > 2⁵³ - 1)
- Supports non-standard values: `Infinity`, `-Infinity`, `NaN`
- Comma operator for chaining operations on nested objects
- Supports JSON, YAML, and TOML formats

## When to Use fx vs jq

**Use fx for:**
- Interactive exploration of JSON data structures
- JavaScript-based transformations
- Streaming JSON processing
- Quick prototyping with familiar JavaScript syntax
- In-place editing with `save()` function

**Use jq for:**
- Complex multi-stage transformations
- Shell scripts where jq is already established
- jq-specific features (recursive descent, advanced path manipulation)