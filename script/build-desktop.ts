// Prépare tous les artefacts nécessaires au packaging Tauri :
//   1. Build du frontend Vite → dist/public
//   2. Bundle du serveur Express → src-tauri/resources/server.cjs
//   3. Copie du frontend → src-tauri/resources/public
//   4. Copie des modèles PDF → resources/templates
//   5. Installation des modules natifs (better-sqlite3, sharp, puppeteer) dans resources/
//   6. Téléchargement des outils Windows (Poppler, Tesseract/fra, ImageMagick)
//   7. Copie du binaire Node comme sidecar Tauri (binaries/node-<triple>)
//
// Exécuté automatiquement par `npm run tauri:build` (beforeBuildCommand).
// DOIT être lancé sur Windows afin que les modules natifs soient compilés
// pour la bonne plateforme et que l'installateur NSIS .exe soit généré.
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, mkdir, cp, writeFile, copyFile, chmod, readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { execFileSync, execSync } from "child_process";
import { createHash } from "crypto";
import { tmpdir } from "os";
import path from "path";

// Modules natifs / à requires dynamiques : restent externes au bundle,
// installés dans resources/node_modules sur la machine de build.
const NATIVE_EXTERNALS = ["better-sqlite3", "sharp", "puppeteer", "bufferutil", "fsevents"];

const RESOURCES = path.resolve("src-tauri/resources");
const BINARIES = path.resolve("src-tauri/binaries");
const TOOLS_DIR = path.join(RESOURCES, "bin");

type DownloadSource = {
  url: string;
  sha256: string;
};

// Versions et empreintes figées pour que le build reste reproductible et
// n'exécute jamais un installateur téléchargé dont l'intégrité est inconnue.
const DEFAULT_WINDOWS_TOOL_SOURCES = {
  poppler: {
    url: "https://github.com/oschwartz10612/poppler-windows/releases/download/v26.02.0-0/Release-26.02.0-0.zip",
    sha256: "993e4a94376ed712fafc7058d724ea0b943d118bbd2305cd9ed55174eb85cda5",
  },
  tesseract: {
    url: "https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20240606/tesseract-ocr-w64-setup-5.4.0.20240606.exe",
    sha256: "c885fff6998e0608ba4bb8ab51436e1c6775c2bafc2559a19b423e18678b60c9",
  },
  frenchData: {
    url: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/923915d4ced2a7235221788285785a29c4a42d4a/fra.traineddata",
    sha256: "ced037562e8c80c13122dece28dd477d399af80911a28791a66a63ac1e3445ca",
  },
  imageMagick: {
    url: "https://github.com/ImageMagick/ImageMagick/releases/download/7.1.2-29/ImageMagick-7.1.2-29-Q16-x64-static.exe",
    sha256: "388dcd10dd2aa83b6e4a836823a8a3b50c1b4f8b12843a20bed063b622f075ae",
  },
};

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

function configuredSource(
  name: string,
  urlVariable: string,
  checksumVariable: string,
  fallback: DownloadSource,
): DownloadSource {
  const url = process.env[urlVariable] ?? fallback.url;
  const sha256 = process.env[checksumVariable] ?? fallback.sha256;
  if (process.env[urlVariable] && !process.env[checksumVariable]) {
    throw new Error(`${name} personnalisé : définissez aussi ${checksumVariable} pour vérifier son intégrité.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    throw new Error(`${checksumVariable} doit être une empreinte SHA-256 de 64 caractères hexadécimaux.`);
  }
  return { url, sha256: sha256.toLowerCase() };
}

function windowsToolSources() {
  return {
    poppler: configuredSource("Poppler", "MAB_POPPLER_URL", "MAB_POPPLER_SHA256", DEFAULT_WINDOWS_TOOL_SOURCES.poppler),
    tesseract: configuredSource("Tesseract", "MAB_TESSERACT_URL", "MAB_TESSERACT_SHA256", DEFAULT_WINDOWS_TOOL_SOURCES.tesseract),
    frenchData: configuredSource("les données françaises de Tesseract", "MAB_TESSDATA_FRA_URL", "MAB_TESSDATA_FRA_SHA256", DEFAULT_WINDOWS_TOOL_SOURCES.frenchData),
    imageMagick: configuredSource("ImageMagick", "MAB_IMAGEMAGICK_URL", "MAB_IMAGEMAGICK_SHA256", DEFAULT_WINDOWS_TOOL_SOURCES.imageMagick),
  };
}

async function verifySha256(file: string, expected: string, label: string): Promise<void> {
  const actual = createHash("sha256").update(await readFile(file)).digest("hex");
  if (actual !== expected) {
    throw new Error(`${label} : empreinte SHA-256 invalide (attendue ${expected}, obtenue ${actual}).`);
  }
}

async function download(source: DownloadSource, destination: string, label: string): Promise<void> {
  console.log(`   Téléchargement ${label}…`);
  const response = await fetch(source.url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${label} : téléchargement impossible (${response.status} ${response.statusText}) depuis ${source.url}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  await verifySha256(destination, source.sha256, label);
}

function runWindows(command: string, args: string[], label: string): void {
  try {
    execFileSync(command, args, { stdio: "inherit" });
  } catch (error) {
    throw new Error(`${label} a échoué : ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function findContainingDirectory(root: string, fileName: string): Promise<string | undefined> {
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(candidate);
      } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
        return current;
      }
    }
  }
  return undefined;
}

async function copyDirectoryContents(source: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source)) {
    await cp(path.join(source, entry), path.join(destination, entry), { recursive: true, force: true });
  }
}

function verifyBundledWindowsTools(): void {
  const env = {
    ...process.env,
    PATH: `${TOOLS_DIR};${process.env.PATH ?? ""}`,
    TESSDATA_PREFIX: path.join(TOOLS_DIR, "tessdata"),
  };
  const run = (file: string, args: string[], label: string): string => {
    try {
      return execFileSync(path.join(TOOLS_DIR, file), args, { env, encoding: "utf8" });
    } catch (error) {
      throw new Error(`Le test de ${label} a échoué : ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  run("pdftotext.exe", ["-v"], "pdftotext");
  run("pdftoppm.exe", ["-v"], "pdftoppm");
  run("magick.exe", ["-version"], "ImageMagick");
  const languages = run("tesseract.exe", ["--list-langs"], "Tesseract");
  if (!/^fra$/m.test(languages)) {
    throw new Error("Le test de Tesseract a échoué : la langue française « fra » est absente de tessdata.");
  }
}

async function prepareWindowsTools(): Promise<void> {
  if (process.platform !== "win32") {
    console.log("── 6/7 Outils Windows ignorés (build hors Windows).");
    return;
  }
  if (process.arch !== "x64") {
    throw new Error("Les outils desktop fournis sont prévus pour Windows x64. Lancez le build sur une machine Windows x64.");
  }

  console.log("── 6/7 Téléchargement des outils Windows hors ligne…");
  const sources = windowsToolSources();
  await mkdir(TOOLS_DIR, { recursive: true });
  const staging = path.join(tmpdir(), `mab-desktop-tools-${process.pid}`);
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  try {
    const popplerZip = path.join(staging, "poppler.zip");
    const popplerDir = path.join(staging, "poppler");
    await download(sources.poppler, popplerZip, "Poppler");
    await mkdir(popplerDir, { recursive: true });
    runWindows(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath '${popplerZip.replace(/'/g, "''")}' -DestinationPath '${popplerDir.replace(/'/g, "''")}' -Force`],
      "L'extraction de Poppler",
    );
    const popplerBin = await findContainingDirectory(popplerDir, "pdftotext.exe");
    if (!popplerBin || !existsSync(path.join(popplerBin, "pdftoppm.exe"))) {
      throw new Error("L'archive Poppler ne contient pas pdftotext.exe et pdftoppm.exe.");
    }
    await copyDirectoryContents(popplerBin, TOOLS_DIR);

    const tesseractInstaller = path.join(staging, "tesseract-setup.exe");
    const tesseractDir = path.join(staging, "tesseract");
    await download(sources.tesseract, tesseractInstaller, "Tesseract");
    // L'installeur NSIS de UB Mannheim accepte /S et /D=<répertoire>.
    runWindows(tesseractInstaller, ["/S", `/D=${tesseractDir}`], "L'installation portable de Tesseract");
    const tesseractBin = await findContainingDirectory(tesseractDir, "tesseract.exe");
    if (!tesseractBin) {
      throw new Error("L'installation de Tesseract ne contient pas tesseract.exe.");
    }
    await copyDirectoryContents(tesseractBin, TOOLS_DIR);
    const tessdataDir = path.join(TOOLS_DIR, "tessdata");
    await mkdir(tessdataDir, { recursive: true });
    await download(sources.frenchData, path.join(tessdataDir, "fra.traineddata"), "les données françaises de Tesseract");

    const imageMagickInstaller = path.join(staging, "imagemagick-setup.exe");
    const imageMagickDir = path.join(staging, "imagemagick");
    await download(sources.imageMagick, imageMagickInstaller, "ImageMagick");
    // L'installeur Inno Setup est installé dans un dossier temporaire, puis seul
    // son contenu d'exécution est copié dans les ressources de l'application.
    runWindows(
      imageMagickInstaller,
      ["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", `/DIR=${imageMagickDir}`],
      "L'installation portable d'ImageMagick",
    );
    const imageMagickBin = await findContainingDirectory(imageMagickDir, "magick.exe");
    if (!imageMagickBin) {
      throw new Error("L'installation d'ImageMagick ne contient pas magick.exe.");
    }
    await copyDirectoryContents(imageMagickBin, TOOLS_DIR);

    const required = ["pdftotext.exe", "pdftoppm.exe", "tesseract.exe", "magick.exe", path.join("tessdata", "fra.traineddata")];
    const missing = required.filter((file) => !existsSync(path.join(TOOLS_DIR, file)));
    if (missing.length > 0) {
      throw new Error(`Outils desktop incomplets après préparation : ${missing.join(", ")}`);
    }
    verifyBundledWindowsTools();
    console.log(`   Outils prêts : ${TOOLS_DIR}`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main() {
  console.log("── 1/7 Build frontend (Vite)…");
  process.env.NODE_ENV = "production";
  await viteBuild();

  console.log("── 2/7 Bundle serveur (esbuild)…");
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

  console.log("── 3/7 Copie du frontend → resources/public…");
  await cp("dist/public", path.join(RESOURCES, "public"), { recursive: true });

  console.log("── 4/7 Copie des modèles PDF → resources/templates…");
  await cp("server/templates", path.join(RESOURCES, "templates"), { recursive: true });

  console.log("── 5/7 Installation des modules natifs dans resources/…");
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

  await prepareWindowsTools();

  console.log("── 7/7 Copie du binaire Node (sidecar)…");
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
