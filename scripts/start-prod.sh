#!/bin/bash
set -e

# Use Nix-installed Chromium (properly patched, no missing lib issues)
NIX_CHROMIUM=$(which chromium 2>/dev/null || true)
if [ -n "$NIX_CHROMIUM" ] && [ -x "$NIX_CHROMIUM" ]; then
  export PUPPETEER_EXECUTABLE_PATH="$NIX_CHROMIUM"
  echo "[startup] Using Nix Chromium at: $NIX_CHROMIUM"
else
  # Fallback: project-local chrome-headless-shell from build phase
  CHROME=$(find "$(pwd)/.chrome-cache" -name "chrome-headless-shell" -type f 2>/dev/null | head -1)
  if [ -n "$CHROME" ] && [ -x "$CHROME" ]; then
    export PUPPETEER_EXECUTABLE_PATH="$CHROME"
    echo "[startup] Using build-phase Chrome at: $CHROME"
  fi
fi

echo "[startup] Starting app..."
exec npm run start
