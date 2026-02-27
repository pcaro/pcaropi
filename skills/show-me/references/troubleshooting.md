# Troubleshooting show-me

Common issues and solutions.

## kitty Remote Control Issues

### "failed to connect to kitty"

**Cause**: kitty remote control is not enabled.

**Solution**: Add to `~/.config/kitty/kitty.conf`:
```
allow_remote_control yes
```

Or start kitty with `--allow-remote-control`.

### "No matching windows found"

**Cause**: The match expression doesn't match any window.

**Solution**:
1. Check `kitten @ ls` to see available windows
2. Ensure the user variable `show_me_tag` was set correctly
3. Try using a more specific match: `id:42` instead of `var:show_me_tag=...`

### Quake terminal hides when demo starts

**Cause**: The quake terminal has `hide_on_focus_loss yes` and the demo window takes focus.

**Solution**: Always use `--keep-focus` when launching:
```bash
kitty @ launch --type=os-window --keep-focus ...
```

Or use `--type=os-window` to launch a separate OS window.

## asciinema Issues

### "error: unexpected argument '--env'"

**Cause**: Using old asciinema syntax.

**Solution**: Use `--capture-env` instead of `--env`:
```bash
asciinema record --idle-time-limit 2 --capture-env 'SHELL,TERM' output.cast
```

### Recording is empty or very small

**Cause**: asciinema may not have captured any output.

**Solution**:
1. Check the cast file has content: `wc -l proof.cast`
2. Ensure `exit` was sent to stop recording properly
3. Check that `--idle-time-limit` is not too aggressive

## PNG Screenshot Issues

### "No text captured from window"

**Cause**: The window may not have rendered yet, or the match expression is wrong.

**Solution**:
1. Add a longer sleep before capturing
2. Verify the window exists: `kitten @ ls`
3. Try `--extent=all` instead of default screen

### ansitoimg fails to create SVG

**Cause**: Some programs emit control characters that break XML/SVG parsing.

**Solution**: The screenshot script strips invalid control chars (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F). If a specific program still causes issues, capture plain text instead:
```bash
kitty @ get-text --match "$SHOW_ME_MATCH" > output.txt
```

### rsvg-convert not found

**Cause**: librsvg not installed.

**Solution**:
- Ubuntu/Debian: `apt install librsvg2-bin`
- macOS: `brew install librsvg`

## GIF/MP4 Generation

### agg not found

**Cause**: agg is not installed.

**Solution**: Download from https://github.com/asciinema/agg/releases

### MP4 is blank or corrupt

**Cause**: FFmpeg needs even dimensions.

**Solution**: The script already handles this with:
```bash
-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"
```

If still issues, check FFmpeg version and codecs.

## Window Management

### Demo window doesn't close

**Cause**: The shell inside the window may still be running.

**Solution**:
```bash
kitty @ send-text --match "$SHOW_ME_MATCH" '\x03'  # Ctrl+C
sleep 1
kitty @ send-text --match "$SHOW_ME_MATCH" 'exit\n'
sleep 1
kitty @ close-window --match "$SHOW_ME_MATCH"
```

### Split window is too small

**Cause**: The quake terminal is only 80x25 by default.

**Solution**: Use `--type=os-window` for a full-size window, or adjust the quake terminal size in its config.