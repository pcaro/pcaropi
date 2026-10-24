---
name: add-mcp-server
description: Add an MCP server to pi. Use when asked to "add mcp server", "configure mcp", "add mcp", "new mcp server", "setup mcp", "connect mcp server", or "register mcp server". Handles both global and project-local configurations.
---

# Add an MCP Server

Pi has native MCP support (`builtin:mcp`). Prefer the `pi mcp` commands; write the JSON only when several servers change at once.

## Step 1: Determine Scope

Ask the user if not obvious from context:

| Scope | Config File | When to Use |
|-------|-------------|-------------|
| **Global** | `~/.pi/agent/mcp.json` | Server used across all projects |
| **Project** | `.pi/mcp.json` (project root, trusted projects only) | Server specific to one project |

A project entry replaces a user-level entry with the same name. A project entry with no `command`/`url` overrides only `enabled`, `exposure`, and `toolExposure`, keeping the rest of the user-level server.

## Step 2: Determine Server Type

MCP servers connect via **stdio** (local process) or **streamable HTTP** (remote URL). Legacy SSE is not supported.

**Stdio server:**
```bash
pi mcp add server-name -- npx -y package-name@latest
pi mcp add server-name --env API_KEY='${TOOLS_KEY}' -- uvx tools-mcp
```

**HTTP server:**
```bash
pi mcp add server-name --url https://example.com/mcp --bearer-token-env-var DOCS_TOKEN
pi mcp add server-name --url https://example.com/mcp --header "Authorization=Bearer ${TOKEN}"
```

Add `-l` to write `.pi/mcp.json` instead of the user-level file.

Equivalent JSON:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "docs": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${DOCS_TOKEN}" },
      "description": "Search and read the product documentation"
    }
  }
}
```

## Step 3: Gather Configuration

Collect only what's needed. `command` or `url` selects the transport; everything else is optional.

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | One executable, no shell syntax (stdio) |
| `args` | string[] | Arguments for `command` (stdio) |
| `env` | object | Environment variables; values support `${VAR}` and `!command` (stdio) |
| `cwd` | string | Working directory (stdio) |
| `url` | string | Streamable HTTP endpoint (HTTP) |
| `headers` | object | HTTP headers; values support `${VAR}` and `!command` (HTTP) |
| `oauth` | object | OAuth client settings; sign-in via `pi mcp login` (HTTP) |
| `timeout` | number | Per-request timeout in seconds (default 60) |
| `enabled` | boolean | Keep the entry without connecting when `false` |
| `description` | string | One sentence about the server; used in the system prompt and tool search ranking |
| `exposure` / `toolExposure` | string | How the server's tools reach the model |

Server names allow only letters, digits, `_`, and `-`. Tools are named `mcp__<server>__<tool>`.

## Step 4: Write the Config

1. Prefer `pi mcp add` — it validates and preserves the rest of the file.
2. If editing JSON directly, read the target file first, merge into `mcpServers`, and write it back.
3. Warn if a server with the same name already exists and confirm before overwriting.
4. Do not put secrets in a project `mcp.json`, and do not commit either file with credentials in it.

## Step 5: Verify

1. Run `pi mcp list` (or `pi mcp list --json`) to check state, tool count, and errors.
2. From inside a session, `/reload` picks up changes made outside it; `/mcp` inspects servers, signs in, reconnects, and toggles exposure.
3. With codemode, MCP tools are reachable via `searchTools('server-name')` and `describeTool(...)`.
