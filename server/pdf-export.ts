import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

const CHROMIUM_CANDIDATES = [
  "/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

function findChromiumExecutable(): string | undefined {
  for (const p of CHROMIUM_CANDIDATES) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  const cacheBase = process.env.HOME
    ? path.join(process.env.HOME, ".cache", "puppeteer", "chrome")
    : "/home/runner/.cache/puppeteer/chrome";
  if (fs.existsSync(cacheBase)) {
    const versions = fs.readdirSync(cacheBase).sort().reverse();
    for (const ver of versions) {
      const candidates = [
        path.join(cacheBase, ver, "chrome-linux64", "chrome"),
        path.join(cacheBase, ver, "chrome-linux", "chrome"),
      ];
      for (const c of candidates) {
        try {
          fs.accessSync(c, fs.constants.X_OK);
          return c;
        } catch {}
      }
    }
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
