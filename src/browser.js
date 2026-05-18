const { chromium } = require("playwright");

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // prevents crashes on GitHub Actions (low shared memory)
      "--disable-gpu",
      "--window-size=1280,800",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    // Realistic user agent so GreyHR doesn't block the headless browser
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  return { browser, page };
}

module.exports = launchBrowser;
