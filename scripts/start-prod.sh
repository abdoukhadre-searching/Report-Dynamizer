#!/bin/bash
set -e

if [ -d ".chrome-deps" ]; then
  export LD_LIBRARY_PATH="$(pwd)/.chrome-deps/usr/lib/x86_64-linux-gnu:$(pwd)/.chrome-deps/usr/lib:${LD_LIBRARY_PATH:-}"
  echo "[startup] Chrome system libs loaded from .chrome-deps"
fi

CHROME=$(find "$(pwd)/.chrome-cache" -name "chrome-headless-shell" -type f 2>/dev/null | head -1)
if [ -n "$CHROME" ] && [ -x "$CHROME" ]; then
  export PUPPETEER_EXECUTABLE_PATH="$CHROME"
  echo "[startup] Chrome ready at: $CHROME"
fi

echo "[startup] Starting app..."
exec npm run start
