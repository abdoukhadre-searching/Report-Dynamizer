#!/bin/bash
set -euo pipefail

npm install --no-audit --no-fund

# SQLite est initialisé et mis à niveau par le bootstrap idempotent de
# server/db.ts. drizzle-kit push tente de recréer les index uniques existants.
# Le bootstrap crée les tables manquantes puis applique seulement des ajouts de
# colonnes et d'index sûrs, sans modifier ni remplacer les données.
npx tsx -e 'import("./server/db.ts").then(() => console.log("SQLite bootstrap OK"))'
