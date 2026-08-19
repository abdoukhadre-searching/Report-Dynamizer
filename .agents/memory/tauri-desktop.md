---
name: Tauri desktop packaging
description: How the offline desktop build works and its non-obvious constraints
---

The first supported desktop release target is Windows NSIS; do not advertise a macOS DMG until browser-backed PDF export works on a clean Mac.

**Why:** Native Node modules and installer formats are OS-specific, and Puppeteer cannot use the Safari browser that ships with macOS.

**How to apply:** Build on Windows and use the Windows-only wrapper/config. Treat macOS packaging as a separate future scope requiring a bundled compatible browser or a different PDF engine.

Let the local sidecar bind an OS-assigned loopback port, then validate its health endpoint before opening the WebView.

**Why:** Preselecting a free port creates a race where another process can claim it, and accepting any TCP listener can open the app against the wrong service.

**How to apply:** Bind only IPv4 loopback, use port zero, communicate the actual port to the shell, and verify the expected HTTP health response.

Keep the database, session secret, and uploads in the platform app-data directory. Resolve all uploaded-file access inside the uploads subtree.

**Why:** Installed apps cannot rely on their working directory being writable, and unchecked upload paths can traverse into the database or session secret.

**How to apply:** Persist a random local session secret, use desktop-compatible cookie settings for loopback HTTP, and enforce canonical path containment before serving or deleting files.

Use the installed system browser for headless PDF rendering where possible.

**Why:** Bundling a second browser is large; loopback URLs using `localhost` can also resolve to IPv6 while the sidecar listens on IPv4.

**How to apply:** Prefer Edge/Chrome and use explicit `127.0.0.1` URLs for internal rendering.
