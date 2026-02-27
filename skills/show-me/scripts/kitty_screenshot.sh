#!/usr/bin/env bash
# kitty_screenshot.sh — Capture a kitty window as a PNG image
#
# Pipeline: kitty @ get-text --ansi → ansitoimg (SVG) → rsvg-convert (PNG)
#
# Usage:
#   kitty_screenshot.sh <match-expression> [output.png]
#   kitty_screenshot.sh 'var:show_me_tag=show_me_12345' /tmp/screenshot.png
#   kitty_screenshot.sh 'id:42' /tmp/screenshot.png
#   kitty_screenshot.sh 'title:my-demo'
#
# The match expression is passed directly to kitty @ get-text --match.
# See `kitten @ get-text --help` for all match options (id, title, pid,
# cwd, cmdline, num, env, var, state, neighbor, session, recent).
#
# Dependencies:
#   - kitty with allow_remote_control enabled
#   - ansitoimg (uv tool install ansitoimg / pipx install ansitoimg)
#   - rsvg-convert (apt install librsvg2-bin / brew install librsvg)

set -euo pipefail

MATCH="${1:?Usage: kitty_screenshot.sh <match-expression> [output.png]}"
OUTPUT="${2:-}"

# Use a temp directory so intermediate files get proper extensions — prevents
# format-selection bugs in ansitoimg across OS/tool versions.
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kitty_screenshot.XXXXXX")"

CAPTURE_FILE="$WORK_DIR/window.ansi"
SVG_FILE="$WORK_DIR/window.svg"
PNG_FILE="$WORK_DIR/window.png"

cleanup() {
    rm -f "$CAPTURE_FILE" "$SVG_FILE"
    # Remove work dir only when PNG was moved to caller-specified output
    if [[ -n "${OUTPUT:-}" ]]; then
        rm -f "$PNG_FILE"
        rmdir "$WORK_DIR" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# 1. Capture window content with ANSI escape codes
#    Strip control chars (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) that are invalid
#    in XML — some programs emit these and they break SVG parsing.
#    We keep 0x09 (tab), 0x0A (newline), 0x0D (carriage return), and 0x1B (ESC).
#    Uses tr with octal ranges instead of sed \xNN for BSD/macOS portability.
kitty @ get-text --match "$MATCH" --ansi \
  | tr -d '\000-\010\013\014\016-\032\034-\037' > "$CAPTURE_FILE"

if [[ ! -s "$CAPTURE_FILE" ]]; then
    echo "Error: No text captured from window matching '$MATCH'" >&2
    echo "Check that the match expression is valid and the window exists." >&2
    echo "Run 'kitten @ ls' to list available windows." >&2
    exit 1
fi

# 2. Convert ANSI → SVG (extension tells ansitoimg to use SVG plugin)
ansitoimg "$CAPTURE_FILE" "$SVG_FILE"

# 3. Convert SVG → PNG
rsvg-convert "$SVG_FILE" -o "$PNG_FILE"

if [[ -n "$OUTPUT" ]]; then
    mv -f "$PNG_FILE" "$OUTPUT"
    echo "$OUTPUT"
else
    echo "$PNG_FILE"
fi
