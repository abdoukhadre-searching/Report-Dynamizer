#!/bin/bash
set -euo pipefail

npm install --no-audit --no-fund

# Ne pas appliquer le schéma automatiquement : le déploiement doit d'abord
# sauvegarder et vérifier la base PostgreSQL active.
npm run check
