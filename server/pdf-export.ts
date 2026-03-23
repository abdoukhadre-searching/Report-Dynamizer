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

  try {
    const { execSync } = require("child_process");
    const whichChromium = execSync("which chromium 2>/dev/null", { encoding: "utf8" }).trim();
    if (whichChromium) { fs.accessSync(whichChromium, fs.constants.X_OK); return whichChromium; }
  } catch {}

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
  console.log(`[pdf] Launching Chromium: ${executablePath || "puppeteer default"}`);
  console.log(`[pdf] URL: ${reportUrl}, selector: ${waitForSelector}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
    ],
  });

  try {
    const page = await browser.newPage();
    try {
      console.log(`[pdf] Navigating to: ${reportUrl}`);
      await page.goto(reportUrl, { waitUntil: "load", timeout: 60000 });
      console.log(`[pdf] Page loaded, waiting for selector: ${waitForSelector}`);
      await page.waitForSelector(waitForSelector, { timeout: 60000 });
      console.log(`[pdf] Selector found, rendering PDF...`);
      await new Promise(r => setTimeout(r, 1000));
      await page.emulateMediaType("print");

      await page.evaluate(async () => {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      });

      // Inject image compression as a raw script to avoid esbuild __name injection
      await page.addScriptTag({
        content: `
          window.__pdfCompressImages = function() {
            var MAX_PX = 2400;
            var QUALITY = 0.90;
            var promises = [];
            var imgs = document.querySelectorAll('img');
            for (var i = 0; i < imgs.length; i++) {
              (function(img) {
                promises.push(new Promise(function(resolve) {
                  function compress() {
                    try {
                      var w = img.naturalWidth, h = img.naturalHeight;
                      if (!w || !h) { resolve(); return; }
                      var scale = w > MAX_PX ? MAX_PX / w : 1;
                      var c = document.createElement('canvas');
                      c.width = Math.round(w * scale);
                      c.height = Math.round(h * scale);
                      var ctx = c.getContext('2d');
                      if (!ctx) { resolve(); return; }
                      ctx.drawImage(img, 0, 0, c.width, c.height);
                      img.src = c.toDataURL('image/jpeg', QUALITY);
                    } catch(e) {}
                    resolve();
                  }
                  if (img.complete && img.naturalWidth > 0) compress();
                  else { img.onload = compress; img.onerror = resolve; }
                }));
              })(imgs[i]);
            }
            var canvases = document.querySelectorAll('canvas');
            for (var j = 0; j < canvases.length; j++) {
              (function(canvas) {
                try {
                  var w = canvas.width, h = canvas.height;
                  if (!w || !h) return;
                  var scale = w > MAX_PX ? MAX_PX / w : 1;
                  var tmp = document.createElement('canvas');
                  tmp.width = Math.round(w * scale);
                  tmp.height = Math.round(h * scale);
                  var ctx = tmp.getContext('2d');
                  if (!ctx) return;
                  ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
                  var dataUrl = tmp.toDataURL('image/jpeg', QUALITY);
                  var img = document.createElement('img');
                  img.src = dataUrl;
                  img.style.cssText = 'width:' + canvas.offsetWidth + 'px;height:' + canvas.offsetHeight + 'px;display:block;';
                  if (canvas.parentNode) canvas.parentNode.replaceChild(img, canvas);
                } catch(e) {}
              })(canvases[j]);
            }
            return Promise.all(promises);
          };
        `,
      });

      // Run the compression and wait for all images to be replaced
      await page.evaluate(() => (window as any).__pdfCompressImages());
      await new Promise(r => setTimeout(r, 600));

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
