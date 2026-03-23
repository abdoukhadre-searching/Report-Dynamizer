import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const SYSTEM_CHROMIUM_CANDIDATES = [
  "/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

function findInPuppeteerCache(browserName: string, binaryName: string): string | undefined {
  const home = process.env.HOME || "/home/runner";
  const cacheBase = path.join(home, ".cache", "puppeteer", browserName);
  if (!fs.existsSync(cacheBase)) return undefined;
  const versions = fs.readdirSync(cacheBase).sort().reverse();
  for (const ver of versions) {
    const candidates = [
      path.join(cacheBase, ver, `${binaryName}-linux64`, binaryName),
      path.join(cacheBase, ver, `${binaryName}-linux`, binaryName),
      path.join(cacheBase, ver, "chrome-linux64", binaryName),
    ];
    for (const c of candidates) {
      try {
        fs.accessSync(c, fs.constants.X_OK);
        return c;
      } catch {}
    }
  }
  return undefined;
}

function findChromiumExecutable(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    try {
      fs.accessSync(process.env.PUPPETEER_EXECUTABLE_PATH, fs.constants.X_OK);
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    } catch {}
  }

  const home = process.env.HOME || "/home/runner";
  const nixChromium = path.join(home, ".nix-profile", "bin", "chromium");
  try {
    fs.accessSync(nixChromium, fs.constants.X_OK);
    return nixChromium;
  } catch {}

  const msPlaywrightBase = path.join(home, ".cache", "ms-playwright");
  if (fs.existsSync(msPlaywrightBase)) {
    const dirs = fs.readdirSync(msPlaywrightBase).filter(d => d.startsWith("chromium")).sort().reverse();
    for (const dir of dirs) {
      const candidates = [
        path.join(msPlaywrightBase, dir, "chrome-linux", "chrome"),
        path.join(msPlaywrightBase, dir, "chrome-linux64", "chrome"),
      ];
      for (const c of candidates) {
        try { fs.accessSync(c, fs.constants.X_OK); return c; } catch {}
      }
    }
  }

  const localChrome = (() => {
    try {
      const cacheDir = path.join(process.cwd(), ".chrome-cache");
      const { execSync } = require("child_process");
      const result = execSync(`find "${cacheDir}" -name "chrome-headless-shell" -type f 2>/dev/null | head -1`, { encoding: "utf8" }).trim();
      if (result && fs.existsSync(result)) return result;
    } catch {}
    return undefined;
  })();
  if (localChrome) return localChrome;

  const headlessShell = findInPuppeteerCache("chrome-headless-shell", "chrome-headless-shell");
  if (headlessShell) return headlessShell;

  const puppeteerChrome = findInPuppeteerCache("chrome", "chrome");
  if (puppeteerChrome) return puppeteerChrome;

  for (const p of SYSTEM_CHROMIUM_CANDIDATES) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  return undefined;
}

export async function renderProjectPdf(reportUrl: string, waitForSelector = "#report-content"): Promise<Buffer> {
  const executablePath = findChromiumExecutable();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--single-process",
    ],
  });

  try {
    const page = await browser.newPage();
    try {
      await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 120000 });
      await page.waitForSelector(waitForSelector, { timeout: 30000 });
      await page.emulateMediaType("print");

      await page.evaluate(async () => {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });

      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => {});
    }
  } finally {
    await browser.close().catch(() => {});
  }
}
