# Web Browser

Minimal CDP-based browser automation for collaborative site exploration, UI testing, and web scraping.

## Overview

This skill provides direct control over Chrome via the Chrome DevTools Protocol (CDP). It runs Chrome in headless mode with remote debugging enabled, allowing you to navigate, interact with pages, execute JavaScript, capture screenshots, and monitor network traffic.

## Installation

```bash
pi install path/to/pcaropi/skills/web-browser
```

## Requirements

- **Chrome/Chromium** - Must be installed on the system
- **Node.js** - For running the CDP client scripts

## Architecture

```
┌─────────────────┐     CDP (WebSocket)     ┌──────────────────┐
│  scripts/*.js   │ ◄──────────────────────►│  Chrome Headless │
│  (CDP Client)   │     localhost:9222      │  (Debug Mode)    │
└─────────────────┘                         └──────────────────┘
        │
        ▼
┌─────────────────┐
│ ~/.cache/agent- │
│ web/logs/*.jsonl│  (Console + Network logs)
└─────────────────┘
```

- **No Puppeteer/Playwright** - Uses CDP directly for minimal overhead
- **Headless mode** - Chrome runs with `--headless=new`
- **Profile support** - Can copy your existing Chrome profile for cookies/logins
- **Background logging** - Automatic capture of console errors and network traffic

## Scripts Reference

| Script | Description |
|--------|-------------|
| `start.js` | Start Chrome on port 9222 with remote debugging |
| `nav.js` | Navigate to URL (current or new tab) |
| `eval.js` | Execute JavaScript in the active page context |
| `screenshot.js` | Capture viewport screenshot |
| `pick.js` | Interactive element picker |
| `dismiss-cookies.js` | Auto-dismiss EU cookie consent dialogs |
| `watch.js` | Background logging (auto-started by start.js) |
| `logs-tail.js` | View captured logs |
| `net-summary.js` | Summarize network responses |

## Usage Examples

### Start Chrome

```bash
./scripts/start.js              # Fresh profile (clean session)
./scripts/start.js --profile    # Use your Chrome profile (cookies, logins)
```

### Navigate

```bash
./scripts/nav.js https://example.com
./scripts/nav.js https://example.com --new    # Open in new tab
```

### Execute JavaScript

```bash
# Simple expressions
./scripts/eval.js 'document.title'
./scripts/eval.js 'document.querySelectorAll("a").length'

# Extract structured data
./scripts/eval.js 'JSON.stringify(Array.from(document.querySelectorAll("a")).map(a => ({ text: a.textContent.trim(), href: a.href })))'
```

### Screenshot

```bash
./scripts/screenshot.js
# Returns: /tmp/screenshot-<timestamp>.png
```

### Interactive Element Picker

```bash
./scripts/pick.js "Click the submit button"
```

Opens the page for visual selection. Click to select, Cmd/Ctrl+Click for multi-select, Enter to finish.

### Handle Cookie Dialogs

```bash
./scripts/dismiss-cookies.js           # Accept cookies
./scripts/dismiss-cookies.js --reject  # Reject cookies
```

### Monitor Logs & Network

```bash
# View current logs
./scripts/logs-tail.js

# Follow logs in real-time
./scripts/logs-tail.js --follow

# Summarize network responses
./scripts/net-summary.js
```

## Typical Workflows

### Web Scraping (Dynamic Pages)

```bash
./scripts/start.js --profile
./scripts/nav.js https://spa-website.com
./scripts/dismiss-cookies.js
./scripts/eval.js '[...document.querySelectorAll(".item")].map(el => el.textContent)'
```

### UI Testing

```bash
./scripts/start.js
./scripts/nav.js https://myapp.test
./scripts/pick.js "Click the login button"
./scripts/eval.js 'document.querySelector(".user-menu")?.textContent'
./scripts/screenshot.js
```

### Debugging

```bash
./scripts/start.js --profile
./scripts/nav.js https://buggy-site.com
# ... interact with the page ...
./scripts/logs-tail.js        # Check for console errors
./scripts/net-summary.js      # Check network responses
```

## Log Files

Background logs are written to:

```
~/.cache/agent-web/logs/YYYY-MM-DD/<targetId>.jsonl
```

Each line is a JSON object with:
- Console messages (logs, warnings, errors)
- Network requests and responses
- JavaScript exceptions

## License

Stolen from Mario.
