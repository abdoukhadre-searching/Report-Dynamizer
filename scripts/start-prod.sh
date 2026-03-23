#!/bin/bash
set -e

echo "[startup] Installing Chromium via Nix..."
if nix-env -iA nixpkgs.chromium 2>/dev/null; then
  NIX_CHROMIUM="$HOME/.nix-profile/bin/chromium"
  if [ -x "$NIX_CHROMIUM" ]; then
    export PUPPETEER_EXECUTABLE_PATH="$NIX_CHROMIUM"
    echo "[startup] Chromium ready at: $NIX_CHROMIUM"
  fi
else
  echo "[startup] Nix unavailable, falling back to Puppeteer download..."
  npx puppeteer browsers install chrome-headless-shell 2>/dev/null || true
fi

echo "[startup] Starting app..."
exec npm run start
