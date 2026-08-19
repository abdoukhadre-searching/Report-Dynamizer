#!/bin/bash
set -euo pipefail

npm install --no-audit --no-fund

# SQLite est initialisé par le DDL idempotent de server/db.ts. drizzle-kit push
# n'est pas idempotent sur cette base : il tente de recréer les index uniques
# users_email_unique/users_username_unique déjà présents. Charger le bootstrap
# vérifie et crée les tables manquantes sans modifier ni remplacer les données.
npx tsx -e 'import("./server/db.ts").then(() => console.log("SQLite bootstrap OK"))'
