---
name: Desktop tool supply chain
description: Security and reproducibility rule for third-party Windows command-line tools bundled with the Tauri installer.
---

Any Windows executable, archive, or OCR language data downloaded as part of the
desktop build must come from an immutable URL and pass an expected SHA-256
verification before it is extracted or executed. A custom mirror or replacement
must provide its own explicit checksum. After staging, run each tool and verify
the French OCR language is discoverable.

**Why:** The desktop build executes third-party installers. Version-shaped URLs
alone do not protect a build from mutable upstream assets, compromised releases,
or corrupted downloads, and filename-only checks do not prove that DLLs and
language data work together.

**How to apply:** When adding or updating a bundled external utility, update its
source URL, checksum, and build-time smoke check together. Keep language models
on an immutable commit or release asset rather than a moving branch.