---
name: google-workspace
description: Access Google Workspace APIs (Drive, Docs, Calendar, Gmail, Sheets, Slides, Chat, People) via local helper scripts without MCP. Handles OAuth login and direct API calls.
---

# Google Workspace (No MCP)

Use this skill when the user wants Google Workspace access in pi **without MCP**.

This skill provides local Node.js helper scripts for:

- OAuth login + token management
- Direct Google API calls (generic and convenience commands)

## Files

- `scripts/auth.js` — login/status/clear token
- `scripts/workspace.js` — call APIs
- `scripts/common.js` — shared auth logic

## One-time setup

1. Dependencies auto-install on first script run (`auth.js` or `workspace.js`).

Optional (to prewarm manually):

```bash
npm install
```

> **Note:** All scripts use paths relative to the skill root (`scripts/auth.js`). Run all commands from the skill directory.

## Pre-flight checks

```bash
# Required
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed"; exit 1; }

# Check dependencies (auto-installed on first run)
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found. Run 'npm install' first."
fi
```

2. Auth mode defaults to **cloud** (same hosted OAuth approach used by the workspace extension), so no local `credentials.json` is required.

Optional local OAuth mode:

- Set `GOOGLE_WORKSPACE_AUTH_MODE=local`
- Create a Google OAuth Desktop app and place credentials at:

```bash
~/.pi/google-workspace/credentials.json
```

Environment overrides:

- `GOOGLE_WORKSPACE_CONFIG_DIR`
- `GOOGLE_WORKSPACE_CREDENTIALS`
- `GOOGLE_WORKSPACE_TOKEN`
- `GOOGLE_WORKSPACE_AUTH_MODE` (`cloud` or `local`)
- `GOOGLE_WORKSPACE_CLIENT_ID` (cloud mode)
- `GOOGLE_WORKSPACE_CLOUD_FUNCTION_URL` (cloud mode)

## Authenticate

```bash
node scripts/auth.js login
```

This opens the browser for OAuth consent automatically.
If you run an API call without a token, `workspace.js` will also trigger the same browser auth flow.

Check auth status:

```bash
node scripts/auth.js status
```

Clear token:

```bash
node scripts/auth.js clear
```

## API usage

### Generic API call

```bash
node scripts/workspace.js call <service> <method.path> '<json params>'
```

**Note on Parameters:**
For methods that require a request body (like `presentations.batchUpdate` or `documents.batchUpdate`), the API expects parameters inside a `resource` (or `requestBody`) property. However, `workspace.js` provides a convenience fix: if you provide a top-level `requests` array and omit `resource`, it will automatically wrap it for you.

Examples:

```bash
# Basic list
node scripts/workspace.js call drive files.list '{"pageSize":5,"fields":"files(id,name)"}'

# Complex batchUpdate (with auto-wrapping for 'requests')
node scripts/workspace.js call slides presentations.batchUpdate '{"presentationId":"ID", "requests":[{"createSlide":{}}]}'

# Traditional format (explicit resource)
node scripts/workspace.js call calendar events.list '{"calendarId":"primary","maxResults":10,"singleEvents":true,"orderBy":"startTime"}'

# Get document/presentation
node scripts/workspace.js call docs documents.get '{"documentId":"<DOC_ID>"}'
```

### Tips for Slides/Docs editing

1. **Find real text lengths and object IDs:**
   Before editing text (using `deleteText` or `insertText`), you must know the exact lengths to avoid index out of bounds errors. Use this `jq` command to inspect a presentation:

```bash
node scripts/workspace.js call slides presentations.get '{"presentationId":"ID"}' 2>/dev/null | jq '[.slides | to_entries[] | {index: .key, slideId: .value.objectId, elements: [.value.pageElements[]? | select(.shape?.text) | {objId: .objectId, text: [.shape.text.textElements[]? | select(.textRun) | .textRun.content] | join(""), len: ([.shape.text.textElements[]? | select(.textRun) | .textRun.content] | join("") | length)}]}]'
```

2. **Text Range Type:**
   When deleting text, always specify `type: 'FIXED_RANGE'` in `textRange`.

```json
{
  "deleteText": {
    "objectId": "OBJ_ID",
    "textRange": { "type": "FIXED_RANGE", "startIndex": 0, "endIndex": 10 }
  }
}
```

### Convenience commands

```bash
node scripts/workspace.js calendar-today
node scripts/workspace.js drive-search "name contains 'Roadmap' and trashed=false"
node scripts/workspace.js gmail-search "from:alice@example.com newer_than:7d"
```

## Operational guidance for the agent

1. Always run `node scripts/auth.js status` first.
2. If auth is missing/expired, run `node scripts/auth.js login` immediately and wait for user to complete browser consent.
3. Do **not** just explain setup unless a command actually failed and its error output requires user action.
4. Use `workspace.js call` for precise operations and return raw JSON results.
5. For user-friendly output, post-process JSON after the call.
6. Never print token contents back to the user.
7. **Custom scripts:** If you create your own Node scripts that `require` modules from this skill, use absolute paths to avoid module not found errors.

Example for `common.js`:
```javascript
const { authorize, getGoogleApis } = require('/home/pcaro/src/pcaropi/skills/google-workspace/scripts/common');
```
