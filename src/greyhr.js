const path = require("path");
require("dotenv").config({ override: true, quiet: true });

const logger = require("./utils/logger");
async function login(page) {
  logger.info("Logging into GreyHR...");

  // domcontentloaded — not networkidle. GreyHR's OAuth + Angular background
  // polling means the network NEVER goes idle, causing a guaranteed timeout.
  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  logger.debug("Page loaded: " + page.url());

  // Wait for Angular splash screen to disappear
  try {
    await page.waitForSelector("text=Just a moment", {
      state: "hidden",
      timeout: 30000,
    });
    logger.debug("Splash screen cleared");
  } catch (_) {
    logger.debug("No splash screen — continuing");
  }

  // Wait for login form
  await page.waitForSelector("#username", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#password", { state: "visible", timeout: 10000 });
  logger.debug("Login form ready");

  // Fill credentials
  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.waitForTimeout(500);
  await page.fill("#password", process.env.GREYHR_PASSWORD);
  await page.waitForTimeout(800);
  logger.debug("Credentials filled");

  // Click only — no waitForNavigation.
  // GreyHR redirects through OAuth (multiple hops) and Angular immediately
  // starts background polling, so networkidle never fires and causes a timeout.
  await page.click("button[type='submit']");
  logger.debug("Login submitted — polling for dashboard...");

  // Poll until the attendance button appears (up to 60s)
  let dashboardLoaded = false;
  const deadline = Date.now() + 60000;

  while (Date.now() < deadline) {
    const url = page.url();
    const signOutCount = await page
      .locator("button:has-text('Sign Out'), gt-button:has-text('Sign Out')")
      .count();
    const signInCount = await page
      .locator("button:has-text('Sign In'), gt-button:has-text('Sign In')")
      .count();

    logger.debug(
      "Waiting... | SignIn: " +
        signInCount +
        " | SignOut: " +
        signOutCount +
        " | URL: " +
        url,
    );

    // Either button visible and we're off the login page = success
    if ((signOutCount > 0 || signInCount > 0) && !url.includes("/login")) {
      dashboardLoaded = true;
      break;
    }

    // Still on login page after 10s = wrong credentials
    if (
      url.includes("/login") &&
      Date.now() > deadline - 50000 &&
      signInCount > 0 &&
      signOutCount === 0
    ) {
      await page.screenshot({ path: "login-failed.png" });
      const err = new Error(
        "Login failed — verify GREYHR_USERNAME and GREYHR_PASSWORD in GitHub Secrets.",
      );
      err.screenshotPath = "login-failed.png";
      throw err;
    }

    await page.waitForTimeout(3000);
  }

  if (!dashboardLoaded) {
    await page.screenshot({ path: "login-timeout.png" });
    const err = new Error(
      "Dashboard did not load within 60s — OAuth redirect may have failed.",
    );
    err.screenshotPath = "login-timeout.png";
    throw err;
  }

  await page.screenshot({ path: "dashboard.png" });
  logger.info("Login successful");
}

async function handleAttendance(page) {
  logger.info("Looking for attendance button...");

  let button = null;

  try {
    const roleBtn = page.getByRole("button", { name: /^sign (in|out)$/i });
    await roleBtn.waitFor({ state: "visible", timeout: 20000 });
    button = roleBtn;
    logger.debug("Button found via role selector");
  } catch (_) {
    logger.warn("Role selector failed, trying fallbacks...");

    const fallbacks = [
      "gt-button:has-text('Sign In')",
      "gt-button:has-text('Sign Out')",
      "button:has-text('Sign In')",
      "button:has-text('Sign Out')",
    ];

    for (const sel of fallbacks) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: "visible", timeout: 5000 });
        button = el;
        logger.debug("Button found via: " + sel);
        break;
      } catch (_) {}
    }
  }

  if (!button) {
    await page.screenshot({ path: "no-button.png" });
    const err = new Error(
      "Attendance button not found — GreyHR layout may have changed.",
    );
    err.screenshotPath = "no-button.png";
    throw err;
  }

  const text = ((await button.textContent()) || "").trim();
  logger.debug("Button text: " + text);

  if (/sign in/i.test(text)) {
    await button.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "signed-in.png" });
    return "Signed In";
  }

  if (/sign out/i.test(text)) {
    await button.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "signed-out.png" });
    return "Signed Out";
  }

  throw new Error("Unexpected button text: " + text);
}

module.exports = { login, handleAttendance };
