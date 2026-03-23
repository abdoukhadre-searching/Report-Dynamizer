#!/bin/bash
set -e
echo "[startup] Installing Puppeteer chrome-headless-shell..."
npx puppeteer browsers install chrome-headless-shell
echo "[startup] Chrome headless shell ready. Starting app..."
exec npm run start
