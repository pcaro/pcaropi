# HTTPie - Modern HTTP Client

Reference: https://httpie.io

## Basic Usage

```bash
http [METHOD] URL [REQUEST_ITEM ...]
```

### Quick Examples

```bash
http example.org                    # GET (default)
http example.org hello=world       # POST with JSON body
http POST example.org name=HTTPie  # Explicit POST
http :3000                         # http://localhost:3000
http :/foo                         # http://localhost/foo
```

## Request Items

| Separator | Type | Example |
|-----------|------|---------|
| `:` | HTTP Header | `Referer:https://httpie.io` |
| `==` | URL Parameter | `search==httpie` |
| `=` | Data Field | `name=HTTPie` |
| `:=` | Non-string JSON | `awesome:=true` `amount:=42` |
| `@` | File Field | `cv@~/CV.pdf` |
| `=@` | Embed File | `essay=@Documents/essay.txt` |
| `:=@` | Raw JSON File | `package:=@./package.json` |

## Content Types

```bash
# JSON (default)
http example.org name=HTTPie language=Python

# Form data
http --form example.org name=HTTPie

# Multipart
http --multipart example.org file@data.txt

# Raw data
http --raw='data' pie.dev/post
```

## Output Options

```bash
# Print specific parts
http --print=hb example.org    # headers + body
http --headers example.org     # response headers only
http --body example.org        # response body only
http --verbose example.org     # full request + response

# Pretty output
http --pretty=all example.org   # colors + formatting
http --pretty=none example.org # raw output

# Save to file
http -o output.json example.org
http --download example.org/large-file
```

## Authentication

```bash
# Basic auth
http -a user:pass example.org

# Bearer token
http -A bearer -a token example.org

# Digest auth
http -A digest -a user:pass example.org
```

## Sessions

```bash
# Create/reuse session (cookies and headers persist)
http --session=mysession example.org

# Read-only session
http --session-read-only=mysession example.org
```

## Network Options

```bash
# Follow redirects
http --follow example.org

# Set timeout
http --timeout=30 example.org

# Use proxy
http --proxy=http:http://proxy:8080 example.org

# Skip SSL verification
http --verify=no example.org
```

## Common Patterns

```bash
# API with JSON
http POST api.example.com/users \
  Authorization:Bearer $TOKEN \
  name="John Doe" \
  email:=john@example.com

# Upload file
http POST api.example.com/upload \
  file@./document.pdf

# Download file
http --download api.example.com/file

# Check status code
http --check-status api.example.com/health
```

## All Flags

| Flag | Description |
|------|-------------|
| `--json, -j` | JSON content type (default) |
| `--form, -f` | Form data |
| `--multipart` | Multipart form data |
| `--compress, -x` | Deflate compression |
| `--pretty` | Output processing (all/colors/format/none) |
| `--print, -p` | What to print (H/B/h/b/m) |
| `--verbose, -v` | Full request and response |
| `--headers, -h` | Response headers only |
| `--body, -b` | Response body only |
| `--output, -o` | Save to file |
| `--download, -d` | Download mode |
| `--session` | Session name/path |
| `--auth, -a` | User[:PASS] or TOKEN |
| `--auth-type, -A` | basic/bearer/digest |
| `--follow, -F` | Follow redirects |
| `--timeout` | Connection timeout |
| `--check-status` | Exit with error on 4xx/5xx |
| `--verify` | SSL verification |
| `--offline` | Build request without sending |