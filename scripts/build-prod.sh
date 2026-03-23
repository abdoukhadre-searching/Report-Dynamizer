#!/bin/bash
set -e

echo "[build] Building application..."
npm run build

echo "[build] Downloading Chrome system dependencies to project directory..."
mkdir -p .chrome-deps
if command -v apt-get > /dev/null 2>&1; then
  apt-get update -qq 2>/dev/null || true
  cd .chrome-deps
  apt-get download \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 libgtk-3-0 \
    libasound2 libdrm2 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libxrender1 libxtst6 libxss1 2>/dev/null || echo "[build] Some packages skipped"
  for f in *.deb; do [ -f "$f" ] && dpkg -x "$f" . 2>/dev/null || true; done
  rm -f *.deb
  cd ..
  echo "[build] Chrome system libs extracted to .chrome-deps/"
else
  echo "[build] apt-get not available, skipping system libs"
fi

echo "[build] Installing chrome-headless-shell to project directory..."
PUPPETEER_CACHE_DIR="$(pwd)/.chrome-cache" npx puppeteer browsers install chrome-headless-shell

echo "[build] Done."
