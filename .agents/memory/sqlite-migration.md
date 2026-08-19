---
name: SQLite migration decisions
description: Conventions chosen when migrating the app from PostgreSQL to SQLite for desktop/offline distribution
---

The app runs entirely on SQLite (better-sqlite3 + Drizzle sqlite-core). No DATABASE_URL needed.

**Conventions to keep consistent:**
- DB file: `mab-projets.db` under `MAB_DATA_DIR` env (defaults to `./data`). Tables auto-created via hand-written DDL in the db bootstrap — any schema change must update BOTH the Drizzle schema and that DDL.
- Timestamps stored as epoch **seconds** (Drizzle `integer mode: "timestamp"`); JSON columns as TEXT with `mode: "json"`; booleans as 0/1 integers; UUIDs generated app-side with `crypto.randomUUID` (global, safe in browser+Node — do NOT import node:crypto in shared/schema.ts, it's bundled client-side).
- Sessions in the same SQLite file via better-sqlite3-session-store (table `sessions`).
- **Why:** offline Tauri desktop distribution — no external DB server allowed.
- `pg` was removed from deps; the one-off PG→SQLite copy script requires reinstalling it to re-run.
- `better-sqlite3` is native — must stay **external** in the esbuild server bundle (script/build.ts allowlist).
