#!/bin/bash
set -e

echo "[startup] Installing Playwright Chromium with system dependencies..."
npx playwright install --with-deps chromium

PLAYWRIGHT_CHROMIUM=$(find "$HOME/.cache/ms-playwright" -name "chrome" -type f 2>/dev/null | head -1)
if [ -n "$PLAYWRIGHT_CHROMIUM" ] && [ -x "$PLAYWRIGHT_CHROMIUM" ]; then
  export PUPPETEER_EXECUTABLE_PATH="$PLAYWRIGHT_CHROMIUM"
  echo "[startup] Using Playwright Chromium at: $PLAYWRIGHT_CHROMIUM"
else
  echo "[startup] Warning: Playwright Chromium not found at expected path"
fi

echo "[startup] Starting app..."
exec npm run start
