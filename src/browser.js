const { chromium } = require("playwright");

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  return { browser, page };
}

module.exports = launchBrowser;
