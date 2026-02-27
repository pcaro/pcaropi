# show-me

An agent skill that lets AI coding agents **prove their work** by recording terminal sessions using **kitty** remote control. The agent drives a kitty window via `kitty @ send-text`, records with asciinema, verifies output with `kitty @ get-text`, and produces GIF/MP4 recordings as proof artifacts.

Adapted from [vfk-rw/show-me](https://github.com/vfk-rw/show-me) (tmux-based) to use kitty's native remote control protocol instead.

## How it works

```
User: "/show-me the tests pass"
         │
         ▼
┌─ Agent ─────────────────────────────┐
│  1. Detect kitty environment        │
│     (regular vs quake terminal)     │
│  2. Ask user: split window, new     │
│     tab, OS window, or existing?    │
│  3. Start asciinema recording       │
│  4. Run commands via send-text      │
│  5. Verify output via get-text      │
│  6. Stop recording, convert output  │
└─────────────────────────────────────┘
         │
         ▼
   proof.cast (+ proof.gif / proof.mp4)
```

## Usage

Once installed, invoke with:

```
/show-me the build compiles and tests pass
/show-me the CLI handles invalid input gracefully
/show-me cowsay works
```

## Window modes

The skill supports four modes for launching the demo window:

| Mode | Launch type | Best for |
|------|------------|----------|
| **OS window** | `--type=os-window` | Quake/quick-access terminal (avoids focus-loss hiding) |
| **Split window** | `--type=window` | Regular kitty — user watches live side-by-side |
| **New tab** | `--type=tab` | When you want the demo in a separate tab |
| **Existing window** | User provides match expression | Pre-arranged layouts |

### Quake terminal support

The skill detects the kitty quick-access (quake-style) terminal and handles its quirks:

- **`hide_on_focus_loss`**: always uses `--keep-focus` to prevent the quake terminal from hiding.
- **Small panel size**: recommends OS window mode to avoid cramped splits, but split mode works for simple demos.
- **`socket-only` remote control**: works automatically via inherited `KITTY_LISTEN_ON`.

## Dependencies

### Required

| Tool | Purpose | Install |
|------|---------|---------|
| **kitty** | Terminal + remote control | [sw.kovidgoyal.net/kitty](https://sw.kovidgoyal.net/kitty/) |
| **asciinema** | Terminal recording (`.cast`) | `pip install asciinema` / `apt install asciinema` |

kitty must have remote control enabled: `allow_remote_control yes` (or `socket-only`) in `kitty.conf`.

### Optional

| Tool | Purpose | Install |
|------|---------|---------|
| **agg** | `.cast` → GIF conversion | [github.com/asciinema/agg](https://github.com/asciinema/agg/releases) |
| **ffmpeg** | GIF → MP4 conversion | `apt install ffmpeg` |
| **ansitoimg** | PNG screenshots (vision verification) | `uv tool install ansitoimg` |
| **rsvg-convert** | SVG → PNG rasterization | `apt install librsvg2-bin` |

## What's in the box

```
skills/show-me/
├── SKILL.md                          # Skill manifest — the agent reads this
├── README.md                         # This file (human-facing)
└── scripts/
    ├── kitty_screenshot.sh           # kitty window → PNG screenshot
    └── wait_for_text.sh              # Poll window until expected text appears
```

### Helper scripts

**`kitty_screenshot.sh`** — Captures a kitty window as a PNG image for vision-capable models.

```bash
./scripts/kitty_screenshot.sh 'var:show_me_tag=demo' /tmp/screenshot.png
```

Pipeline: `kitty @ get-text --ansi` → `ansitoimg` (SVG) → `rsvg-convert` (PNG).

**`wait_for_text.sh`** — Polls a kitty window until expected text appears (replaces fragile `sleep` calls).

```bash
./scripts/wait_for_text.sh 'var:show_me_tag=demo' 'PASS' 30
# Exit 0 = found, Exit 1 = timeout, Exit 2 = error
```

## Differences from the original (tmux) version

| Aspect | Original (tmux) | This version (kitty) |
|--------|-----------------|---------------------|
| Session management | `tmux split-window` / `tmux new-session` | `kitty @ launch --type=window/tab/os-window` |
| Command driving | `tmux send-keys` | `kitty @ send-text` |
| Output reading | `tmux capture-pane -p` | `kitty @ get-text` (with `--extent` options) |
| Window targeting | Pane IDs (`%3`) | Match expressions with user variables (`var:show_me_tag=...`) |
| Screenshots | `tmux capture-pane -e` → `ansitoimg` → `rsvg-convert` | `kitty @ get-text --ansi` → `ansitoimg` → `rsvg-convert` |
| Quake terminal | N/A | Full support (OS window mode, focus-loss handling) |
| Detached sessions | `tmux new-session -d` | `--type=os-window` with `--keep-focus` |

## License

MIT (adapted from [vfk-rw/show-me](https://github.com/vfk-rw/show-me), also MIT)
