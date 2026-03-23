#!/bin/bash
set -e
npm run build
npx puppeteer browsers install chrome
