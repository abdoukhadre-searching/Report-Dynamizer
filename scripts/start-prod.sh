#!/bin/bash
set -e
echo "[startup] Installing Puppeteer Chrome..."
npx puppeteer browsers install chrome
echo "[startup] Chrome ready. Starting app..."
exec npm run start
