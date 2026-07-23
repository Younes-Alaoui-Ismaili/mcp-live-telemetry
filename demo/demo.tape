# demo.tape: recording script for the 90 second demo GIF.
#
# Render locally with vhs (https://github.com/charmbracelet/vhs), which needs
# ffmpeg and ttyd installed:
#
#   npm install && npm run build
#   vhs demo/demo.tape
#
# Output is written to demo/demo.gif.

Output demo/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 800
Set Padding 24
Set Theme "Dracula"
Set TypingSpeed 45ms

# Build quietly before recording the interesting part.
Hide
Type "npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1" Enter
Sleep 4s
Show

Type "# mcp-live-telemetry: a Model Context Protocol server over stdio" Enter
Sleep 1500ms

Type "# One real MCP session: list devices, inject a fault, detect it." Enter
Sleep 1500ms

Type "node scripts/smoke.mjs" Enter
Sleep 7s

Type "# The anomaly appears within the same session. That is the whole pitch." Enter
Sleep 3s
