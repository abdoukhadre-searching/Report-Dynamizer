import puppeteer from "puppeteer";
import * as fs from "fs";

const PLAYWRIGHT_CHROMIUM =
  "/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome";

function findChromiumExecutable(): string | undefined {
  try {
    fs.accessSync(PLAYWRIGHT_CHROMIUM, fs.constants.X_OK);
    return PLAYWRIGHT_CHROMIUM;
  } catch {
    return undefined;
  }
}

export async function renderProjectPdf(reportUrl: string): Promise<Buffer> {
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
      await page.waitForSelector("#report-content", { timeout: 30000 });
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
