# surf - Browser Automation CLI

Reference: https://github.com/nicobailon/surf-cli

## Installation

```bash
npm install -g surf-cli
surf install <extension-id>  # Copy ID from chrome://extensions
```

## Navigation

```bash
surf go "https://example.com"
surf back
surf forward
```

## Reading Pages

```bash
surf read                    # Accessibility tree + visible text
surf read --depth 3          # Limit tree depth
surf read --compact          # Remove empty elements
surf page.text               # Raw text only
```

## Element Interaction

```bash
# Click by element reference
surf click e5

# Click by CSS selector
surf click --selector ".btn"

# Type text
surf type "hello"

# Type and submit
surf type "hello" --submit
```

## Semantic Locators

No selectors needed - use ARIA roles and accessible names:

```bash
# Click by role
surf locate.role button --name "Submit" --action click

# Click by visible text
surf locate.text "Sign In" --action click

# Fill form by label
surf locate.label "Email" --action fill --value "test@example.com"
```

## Screenshots

```bash
surf screenshot              # Auto-saves to /tmp
surf screenshot --full       # Full resolution
surf screenshot --annotate   # With element labels
surf snap                    # Alias for screenshot
```

## Tabs

```bash
surf tab.list
surf tab.new "https://example.com"
surf tab.switch 123
surf tab.close 123
```

## Windows

Isolate agent browser from your personal browser:

```bash
surf window.new "https://example.com"
surf window.list
surf window.close 123456
```

## Device Emulation

```bash
surf emulate.device "iPhone 14"
surf emulate.device reset
```

## AI Queries

Query AI services using your browser's logged-in session (no API keys needed):

```bash
surf chatgpt "explain this code"
surf gemini "explain quantum computing"
surf perplexity "what is quantum computing"
surf grok "latest AI trends"
surf aistudio "explain quantum computing"
surf aistudio.build "todo app"  # Generate full web apps
```

## Network Capture

All requests are automatically logged while surf is active:

```bash
surf network                 # View captured requests
surf network --urls          # Just URLs
surf network.get r_001       # Full request/response
```

## Workflows

Multi-step automation as single commands:

```bash
surf do 'go "https://example.com" | click e5 | screenshot'
```

## Global Options

```bash
--tab-id <id>      # Target specific tab
--window-id <id>   # Target specific window
--json             # Output raw JSON
--soft-fail        # Warn instead of error on restricted pages
```

## Key Features

| Feature | Description |
|---------|-------------|
| Agent-agnostic | Works with Claude Code, GPT, Gemini, Cursor, any CLI-capable agent |
| Zero config | Install extension, run commands |
| AI without API keys | Use your logged-in browser session |
| Network capture | Automatic request logging |
| Workflows | Multi-step automation |

## Common Patterns

```bash
# Navigate and read
surf go "https://example.com" && surf read

# Find and click button
surf locate.role button --name "Submit" --action click

# Fill form
surf locate.label "Email" --action fill --value "user@example.com"
surf locate.label "Password" --action fill --value "secret"
surf locate.role button --name "Sign In" --action click

# Capture workflow
surf do 'go "https://example.com" | read | screenshot --annotate'
```