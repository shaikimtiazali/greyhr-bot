const { chromium } = require("playwright");

const isLinux = process.platform === "linux";

async function launchBrowser() {
  const commonArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-default-apps",
    "--disable-sync",
    "--disable-translate",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI,BlinkGenPropertyTrees,ImprovedCookieControls,LazyFrameLoading",
    "--window-size=1280,800",
  ];

  // --single-process and --no-zygote save ~120MB RAM on Render
  // but crash Chromium on Windows/Mac — Linux only
  const linuxArgs = ["--single-process", "--no-zygote"];

  const browser = await chromium.launch({
    headless: true,
    args: isLinux ? [...commonArgs, ...linuxArgs] : commonArgs,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Block images, media, fonts — not needed for login/attendance
  // Stylesheets are allowed — blocking them can break Angular page rendering
  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "media", "font"].includes(type)) {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();

  return { browser, page };
}

module.exports = launchBrowser;
