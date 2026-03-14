import puppeteer, { type Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

export async function renderProjectPdf(reportUrl: string): Promise<Buffer> {
  const browser = await getBrowser();
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
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
