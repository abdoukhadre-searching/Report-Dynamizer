---
name: PostgreSQL PWA source
description: The durable data-source decision for the web PWA and safe restoration of historical records.
---

The web PWA uses PostgreSQL as the authoritative store for business records and
sessions. A legacy SQLite database may be retained only as a backup; it must
never become an implicit runtime fallback.

**Why:** Separate SQLite and PostgreSQL stores caused valid historical accounts
and recent project changes to appear missing depending on which runtime was
active.

**How to apply:** Before a deployment that changes persistence, back up any
legacy local file, verify the PostgreSQL target and historical account data,
and stop if a schema tool proposes destructive changes. Keep the PWA’s
PostgreSQL schema compatible with its existing data rather than replacing it.