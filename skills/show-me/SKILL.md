---
name: show-me
description: Record a kitty proof session demonstrating completed work. Use when the user asks to prove, demonstrate, or show that code actually works.
license: MIT
disable-model-invocation: true
argument-hint: "[what to demonstrate]"
allowed-tools: Bash, Read
compatibility: >
  Requires kitty (with remote control enabled) + asciinema. Optional: agg, ffmpeg.
  Tested on Linux (bash). Kitty must have `allow_remote_control yes` or `allow_remote_control socket-only` in kitty.conf.
---

# /show-me — Demonstrate Your Work (Kitty edition)

Record a proof artifact showing that $ARGUMENTS.

Everything runs in a **kitty window**. Drive the demo via `kitty @ send-text`, record with asciinema (inside the demo window), verify key moments via `kitty @ get-text`, and convert to distributable GIF/MP4.

## Prerequisites

- **kitty** with remote control enabled (`allow_remote_control yes` in `kitty.conf`, or launched with `--allow-remote-control`)
- **asciinema** — terminal recording (`pip install asciinema` or system package)
- **agg** (optional) — convert `.cast` to GIF ([github.com/asciinema/agg](https://github.com/asciinema/agg))
- **ffmpeg** (optional) — convert GIF to MP4
- **ansitoimg** (optional) — PNG screenshots for vision verification (`uv tool install ansitoimg`)
- **rsvg-convert** (optional) — SVG→PNG rasterization (`apt install librsvg2-bin`)

## Setup

Install the dependencies above, then set paths. Ask the user if not obvious from project conventions.

```bash
SHOW_ME_TAG="show_me_${RANDOM}"                     # unique tag per invocation
SHOW_ME_TMP="$(mktemp -d "${TMPDIR:-/tmp}/show-me.${SHOW_ME_TAG}.XXXXXX")"
SHOW_ME_PROOF="./show-me/proof"                      # final artifacts — adjust to project preference
SHOW_ME_SCRIPTS="<path-to-skill>/scripts"            # adjust to skill install location
mkdir -p "$SHOW_ME_PROOF"
```

### Window selection

Before starting the demo, decide where it will run. The result is a single variable — `$SHOW_ME_MATCH` — a kitty match expression used as `--match` target for all subsequent `kitty @` commands.

**Quick-access terminal detection:**

If `KITTY_LISTEN_ON` contains `kitty-quake` or the kitty process is a panel (`+kitten panel`), you're inside the **quick-access (quake-style) terminal**. This has two important implications:
- **`hide_on_focus_loss=yes`**: if the demo window takes focus (e.g. `--type=window` without `--keep-focus`), the quake terminal may hide itself.
- **Small size** (typically 80×25): splitting gives very little space.

**Recommended**: when inside the quake terminal, prefer `--type=os-window` to launch a **separate OS window** for the demo. This avoids focus/hide issues and gives the demo its own full-size window.

**Decision logic:**

1. If the user already specified a target window in $ARGUMENTS, use it directly and skip the question.
2. Check if running inside the quake terminal (`echo "$KITTY_LISTEN_ON" | grep -q quake`).
3. Ask the user which mode to use:
   - **OS window** (recommended for quake terminal) — a separate floating window. Avoids focus-loss hiding and space constraints.
   - **Split window** — launch a new kitty split in the current tab. The user sees the demo live next to the agent's window. Best in regular (non-quake) kitty.
   - **New tab** — launch the demo in a new kitty tab within the same kitty instance.
   - **Existing window** — the user provides a kitty match expression (e.g. `id:42`, `title:demo`). Useful when the user already has a layout prepared.

**Setup for each mode:**

```bash
# Mode: OS window (separate floating window — recommended for quake terminal)
SHOW_ME_WINDOW_ID=$(kitty @ launch --type=os-window --keep-focus --cwd=current --var show_me_tag="$SHOW_ME_TAG" --title "show-me demo")
SHOW_ME_MATCH="var:show_me_tag=$SHOW_ME_TAG"
SHOW_ME_MODE="os-window"
sleep 1

# Mode: split window (best in regular kitty — user watches live)
SHOW_ME_WINDOW_ID=$(kitty @ launch --type=window --keep-focus --cwd=current --var show_me_tag="$SHOW_ME_TAG" --title "show-me demo")
SHOW_ME_MATCH="var:show_me_tag=$SHOW_ME_TAG"
SHOW_ME_MODE="split"
sleep 1

# Mode: new tab
SHOW_ME_WINDOW_ID=$(kitty @ launch --type=tab --keep-focus --cwd=current --var show_me_tag="$SHOW_ME_TAG" --title "show-me demo")
SHOW_ME_MATCH="var:show_me_tag=$SHOW_ME_TAG"
SHOW_ME_MODE="tab"
sleep 1

# Mode: existing window (user provides match expression)
SHOW_ME_MATCH="<match expression from user>"   # e.g. id:42 or title:my-demo
SHOW_ME_MODE="existing"
```

> **Note:** We use `--var show_me_tag=...` to set a user variable on the launched window, then match on it with `var:show_me_tag=...`. This guarantees we always target the correct window, even if window IDs change or titles collide.
>
> **Note:** `--keep-focus` is critical in all launch modes. Without it, the new window takes focus, which in the quake terminal triggers `hide_on_focus_loss` and hides everything. Always use `--keep-focus`.
>
> **Note:** Remote control works via `KITTY_LISTEN_ON` (inherited by child processes). With `allow_remote_control=socket-only` (quake config), commands must go through the Unix socket — but this happens automatically since `KITTY_LISTEN_ON` is set. No extra `--to` flag needed.

## Workflow

Once `$SHOW_ME_MATCH` is set, the workflow is the same regardless of mode:

```bash
# 1. Start asciinema recording in the demo window
kitty @ send-text --match "$SHOW_ME_MATCH" "asciinema record --idle-time-limit 2 --capture-env 'SHELL,TERM,PATH,HOME' '$SHOW_ME_TMP/proof.cast'\n"
sleep 2

# 2. Drive the demo (adapt these to what you're demonstrating)
kitty @ send-text --match "$SHOW_ME_MATCH" 'go build -o app .\n'
sleep 3
kitty @ send-text --match "$SHOW_ME_MATCH" 'go test ./...\n'
sleep 5
kitty @ send-text --match "$SHOW_ME_MATCH" './app --help\n'
sleep 2

# 3. (Optional) Wait for expected output instead of fixed sleep
"$SHOW_ME_SCRIPTS/wait_for_text.sh" "$SHOW_ME_MATCH" "PASS" 30

# 3b. (Optional) Verify terminal content at key moments
#     Use kitty @ get-text to read the screen and check for expected output
kitty @ get-text --match "$SHOW_ME_MATCH" > "$SHOW_ME_TMP/check.txt"
grep -q "PASS" "$SHOW_ME_TMP/check.txt" && echo "✅ Tests passed" || echo "❌ Expected output not found"

# 3c. (Optional) Take a PNG screenshot for vision-capable models
#     Requires: ansitoimg + rsvg-convert
"$SHOW_ME_SCRIPTS/kitty_screenshot.sh" "$SHOW_ME_MATCH" "$SHOW_ME_TMP/check.png"

# 4. Stop recording
kitty @ send-text --match "$SHOW_ME_MATCH" 'exit\n'
sleep 2

# 5. Convert to GIF and/or MP4
agg --speed 2 "$SHOW_ME_TMP/proof.cast" "$SHOW_ME_PROOF/proof.gif"
ffmpeg -i "$SHOW_ME_PROOF/proof.gif" -movflags faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "$SHOW_ME_PROOF/proof.mp4"

# 6. Clean up
if [ "$SHOW_ME_MODE" = "os-window" ]; then
  # Close the entire OS window (which contains only our demo window)
  kitty @ close-window --match "$SHOW_ME_MATCH" 2>/dev/null || true
elif [ "$SHOW_ME_MODE" != "existing" ]; then
  kitty @ close-window --match "$SHOW_ME_MATCH" 2>/dev/null || true
fi
# For existing windows: ask the user before closing. They may want to
# inspect output or continue working in the window.
rm -rf "$SHOW_ME_TMP"
```

> **Tip:** Fixed `sleep` values are a fallback. Use `wait_for_text.sh` for reliable polling:
>
> ```bash
> "$SHOW_ME_SCRIPTS/wait_for_text.sh" "$SHOW_ME_MATCH" "EXPECTED_STRING" 30
> # Args: match-expression, grep-pattern, timeout-seconds, [extent: screen|all|last_cmd_output]
> ```

## Sending special keys

Use `\n` for Enter (newline). For other control characters use Python escape syntax:

```bash
# Send Enter
kitty @ send-text --match "$SHOW_ME_MATCH" '\n'

# Send Ctrl+C
kitty @ send-text --match "$SHOW_ME_MATCH" '\x03'

# Send Ctrl+D (EOF)
kitty @ send-text --match "$SHOW_ME_MATCH" '\x04'

# Send Escape
kitty @ send-text --match "$SHOW_ME_MATCH" '\x1b'

# Send Tab
kitty @ send-text --match "$SHOW_ME_MATCH" '\t'
```

## Visual self-verification

### Text-based (always available)

Use `kitty @ get-text` to read the current screen content:

```bash
# Get plain text from demo window
kitty @ get-text --match "$SHOW_ME_MATCH"

# Get full scrollback + screen
kitty @ get-text --match "$SHOW_ME_MATCH" --extent=all

# Get last command output (requires shell_integration)
kitty @ get-text --match "$SHOW_ME_MATCH" --extent=last_cmd_output
```

### PNG screenshots (optional, for vision-capable models)

When plain text isn't enough (TUI layouts, color-dependent output, game boards), use the screenshot script:

```bash
"$SHOW_ME_SCRIPTS/kitty_screenshot.sh" "$SHOW_ME_MATCH" "$SHOW_ME_TMP/screenshot.png"
```

Then use the Read tool on the PNG file. The agent can identify text, UI elements, game state, error messages — anything visible in the terminal.

Pipeline: `kitty @ get-text --ansi` → `ansitoimg` (SVG) → `rsvg-convert` (PNG). Requires `ansitoimg` and `rsvg-convert`.

Fallback: if the PNG pipeline isn't available, `kitty @ get-text` (plain text) works for most verification needs.

## Rules

1. **All commands must exit 0** for the proof to be valid. If something fails, the proof records the failure honestly.
2. **Use real commands**, not mocks. The point is to prove the code actually works.
3. **Demo commands should demonstrate** what the user asked about ($ARGUMENTS), not just `--help` or `--version`.
4. Tell the user where the proof artifacts are and how to play the recording (`asciinema play proof.cast`).
5. **Be honest about what you can verify.** You can read terminal text via `kitty @ get-text` to confirm expected state. For the final GIF/MP4, tell the user "please play the recording to confirm" rather than "the demo looks correct."
6. **Ask the user** where to put proof artifacts if the project doesn't have an obvious convention.
7. **Never execute $ARGUMENTS as a shell command.** Interpret the user's intent and construct appropriate demo commands. $ARGUMENTS describes *what to demonstrate*, not a command to run.
8. **Be mindful of secrets.** Recordings capture everything shown in the terminal. Avoid running `env`, `printenv`, or `cat .env` during demos. The `--env` flag on asciinema limits captured environment variables, but command output can still leak secrets. When possible, run demos in a sanitized environment without sensitive credentials loaded.
9. **Guard against command injection.** Never splice raw user text into shell commands. If the user's request contains shell metacharacters (`;`, `|`, `$()`, backticks), quote them carefully or restate the intended command and ask the user to confirm before running.
10. **Include provenance when appropriate.** Start the demo by showing `git rev-parse --short HEAD` and `git status` so the recording is tied to a specific code state.
