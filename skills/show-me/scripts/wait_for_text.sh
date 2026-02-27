#!/usr/bin/env bash
# wait_for_text.sh — Poll a kitty window until expected text appears
#
# Usage:
#   wait_for_text.sh <match-expression> <expected-text> [timeout-seconds] [extent]
#   wait_for_text.sh 'var:show_me_tag=show_me_123' 'PASS' 30
#   wait_for_text.sh 'id:42' '\$' 15 screen
#   wait_for_text.sh 'title:demo' 'Build succeeded' 60 all
#
# Arguments:
#   match-expression  Kitty window match expression (passed to --match)
#   expected-text     grep pattern to search for (basic regex)
#   timeout-seconds   Max seconds to wait (default: 30)
#   extent            What text to get: screen, all, last_cmd_output,
#                     last_non_empty_output (default: screen)
#                     Note: last_cmd_output and friends require shell_integration.
#
# Exit codes:
#   0  Text found
#   1  Timeout — text not found within the time limit
#   2  Usage error or kitty connection failure
#
# Dependencies:
#   - kitty with allow_remote_control enabled

set -euo pipefail

MATCH="${1:?Usage: wait_for_text.sh <match-expression> <expected-text> [timeout-seconds] [extent]}"
EXPECTED="${2:?Usage: wait_for_text.sh <match-expression> <expected-text> [timeout-seconds] [extent]}"
TIMEOUT="${3:-30}"
EXTENT="${4:-screen}"

# Validate extent
case "$EXTENT" in
    screen|all|first_cmd_output_on_screen|last_cmd_output|last_non_empty_output|last_visited_cmd_output|selection)
        ;;
    *)
        echo "Error: Invalid extent '$EXTENT'. Valid: screen, all, first_cmd_output_on_screen, last_cmd_output, last_non_empty_output, last_visited_cmd_output, selection" >&2
        exit 2
        ;;
esac

# Quick sanity check: can we reach kitty and the window?
if ! kitty @ get-text --match "$MATCH" --extent "$EXTENT" >/dev/null 2>&1; then
    echo "Error: Cannot get text from window matching '$MATCH'." >&2
    echo "Check that kitty remote control is enabled and the window exists." >&2
    echo "Run 'kitten @ ls' to list available windows." >&2
    exit 2
fi

elapsed=0
interval=1

while [ "$elapsed" -lt "$TIMEOUT" ]; do
    if kitty @ get-text --match "$MATCH" --extent "$EXTENT" 2>/dev/null | grep -q "$EXPECTED"; then
        echo "✅ Found '$EXPECTED' after ${elapsed}s"
        exit 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
done

echo "❌ Timeout (${TIMEOUT}s): '$EXPECTED' not found in window matching '$MATCH'" >&2
exit 1
