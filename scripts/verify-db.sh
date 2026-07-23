#!/usr/bin/env bash
# Verifies the database-backed auth + project flows end-to-end against a
# running dev server (npm run dev on port 5000). Creates a temporary user,
# exercises register/login/me/project create+list, and cleans up.
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:5000}"
JAR="$(mktemp)"
EMAIL="verify-db-$(date +%s)@example.com"
PASS="secret123"

fail() { echo "FAIL: $1" >&2; exit 1; }

echo "1) register"
REG=$(curl -sf -c "$JAR" -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"name\":\"Verify DB\",\"password\":\"$PASS\"}") || fail "register request failed"
echo "$REG" | grep -q "$EMAIL" || fail "register response missing email"

echo "2) login"
curl -sf -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | grep -q "$EMAIL" || fail "login failed"

echo "3) me (session persisted)"
curl -sf -b "$JAR" "$BASE/api/auth/me" | grep -q "$EMAIL" || fail "session not persisted"

echo "4) create project"
PROJ=$(curl -sf -b "$JAR" -X POST "$BASE/api/projects" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Projet Verify DB"}') || fail "project create failed"
PID=$(echo "$PROJ" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
[ -n "$PID" ] || fail "no project id returned"

echo "5) list projects"
curl -sf -b "$JAR" "$BASE/api/projects" | grep -q "$PID" || fail "created project not in list"

echo "6) cleanup"
curl -sf -b "$JAR" -X DELETE "$BASE/api/projects/$PID" >/dev/null || echo "warn: project cleanup failed"

echo "OK: register/login/session/project flows verified against PostgreSQL"
