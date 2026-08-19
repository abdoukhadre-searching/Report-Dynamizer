// Prépare tous les artefacts nécessaires au packaging Tauri :
//   1. Build du frontend Vite → dist/public
//   2. Bundle du serveur Express → src-tauri/resources/server.cjs
//   3. Copie du frontend → src-tauri/resources/public
//   4. Copie des modèles PDF → resources/templates
//   5. Installation des modules natifs (better-sqlite3, sharp, puppeteer) dans resources/
//   6. Copie du binaire Node comme sidecar Tauri (binaries/node-<triple>)
//
// Exécuté automatiquement par `npm run tauri:build` (beforeBuildCommand).
// DOIT être lancé sur Windows afin que les modules natifs soient compilés
// pour la bonne plateforme et que l'installateur NSIS .exe soit généré.
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, mkdir, cp, writeFile, copyFile, chmod } from "fs/promises";
import { existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";

// Modules natifs / à requires dynamiques : restent externes au bundle,
// installés dans resources/node_modules sur la machine de build.
const NATIVE_EXTERNALS = ["better-sqlite3", "sharp", "puppeteer", "bufferutil", "fsevents"];

const RESOURCES = path.resolve("src-tauri/resources");
const BINARIES = path.resolve("src-tauri/binaries");

function targetTriple(): string {
  try {
    const out = execSync("rustc -Vv", { encoding: "utf8" });
    const m = out.match(/host:\s*(\S+)/);
    if (m) return m[1];
  } catch {}
  // Fallback sans rustc
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  if (process.platform === "win32") return `${arch}-pc-windows-msvc`;
  if (process.platform === "darwin") return `${arch}-apple-darwin`;
  return `${arch}-unknown-linux-gnu`;
}

async function main() {
  console.log("── 1/6 Build frontend (Vite)…");
  process.env.NODE_ENV = "production";
  await viteBuild();

  console.log("── 2/6 Bundle serveur (esbuild)…");
  await rm(RESOURCES, { recursive: true, force: true });
  await mkdir(RESOURCES, { recursive: true });
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(RESOURCES, "server.cjs"),
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    external: NATIVE_EXTERNALS,
    logLevel: "info",
  });

  console.log("── 3/6 Copie du frontend → resources/public…");
  await cp("dist/public", path.join(RESOURCES, "public"), { recursive: true });

  console.log("── 4/6 Copie des modèles PDF → resources/templates…");
  await cp("server/templates", path.join(RESOURCES, "templates"), { recursive: true });

  console.log("── 5/6 Installation des modules natifs dans resources/…");
  await writeFile(
    path.join(RESOURCES, "package.json"),
    JSON.stringify({
      name: "mab-projets-server",
      private: true,
      dependencies: {
        "better-sqlite3": "^12.11.1",
        "better-sqlite3-session-store": "^0.1.0",
        sharp: "^0.34.5",
        puppeteer: "^24.39.1",
      },
    }, null, 2),
  );
  execSync("npm install --omit=dev --no-audit --no-fund", {
    cwd: RESOURCES,
    stdio: "inherit",
    // Pas de téléchargement de Chromium : le desktop utilise Edge/Chrome système
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "1", PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "1" },
  });

  console.log("── 6/6 Copie du binaire Node (sidecar)…");
  await mkdir(BINARIES, { recursive: true });
  const triple = targetTriple();
  const ext = process.platform === "win32" ? ".exe" : "";
  const dest = path.join(BINARIES, `node-${triple}${ext}`);
  await copyFile(process.execPath, dest);
  if (process.platform !== "win32") await chmod(dest, 0o755);
  console.log(`   Sidecar : ${dest}`);

  if (!existsSync("src-tauri/icons/icon.ico")) {
    console.warn("⚠ Icônes manquantes — exécuter : npx tauri icon client/public/favicon.png");
  }
  console.log("✔ Préparation desktop terminée.");
}

main().catch((e) => { console.error(e); process.exit(1); });
