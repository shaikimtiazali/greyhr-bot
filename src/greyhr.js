const path = require("path");
require("dotenv").config({ override: true, quiet: true });
const logger = require("./utils/logger");

async function login(page) {
  logger.info("Logging into GreyHR...");

  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  try {
    await page.waitForSelector("text=Just a moment", {
      state: "hidden",
      timeout: 30000,
    });
    logger.info("Splash screen cleared");
  } catch (_) {
    logger.error("No splash screen detected");
  }

  await page.waitForSelector("#username", {
    state: "visible",
    timeout: 30000,
  });
  await page.waitForSelector("#password", {
    state: "visible",
    timeout: 10000,
  });
  logger.info("Login form ready");

  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.waitForTimeout(500);
  await page.fill("#password", process.env.GREYHR_PASSWORD);
  await page.waitForTimeout(500);
  logger.info("Credentials filled");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 60000 }),
    page.click("button[type='submit']"),
  ]);
  try {
    await page.waitForSelector("text=Just a moment", {
      state: "hidden",
      timeout: 20000,
    });
  } catch (_) {}
  // Try to detect dashboard
  let dashboardLoaded = false;
  for (let i = 0; i < 6; i++) {
    const url = page.url();
    const signInCount = await page.locator("text=Sign In").count();
    const signOutCount = await page.locator("text=Sign Out").count();
    logger.info(
      `Check ${i + 1}/6 | URL: ${url} | SignIn:${signInCount} SignOut:${signOutCount}`,
    );

    // Still on login page = wrong credentials
    if (url.includes("/login") && signInCount > 0 && signOutCount === 0) {
      await page.screenshot({ path: "step5-loginfailed.png" });
      const err = new Error(
        "Login failed: Still on login page. Verify GREYHR_USERNAME and GREYHR_PASSWORD in GitHub Secrets.",
      );
      err.screenshotPath = "step5-loginfailed.png";
      throw err;
    }

    if (!url.includes("/login") || signOutCount > 0) {
      dashboardLoaded = true;
      break;
    }

    await page.waitForTimeout(5000);
  }

  if (!dashboardLoaded) {
    await page.screenshot({ path: "timeout.png" });
    const err = new Error("Dashboard did not load within 30s after login.");
    err.screenshotPath = "timeout.png";
    throw err;
  }

  // await page.screenshot({ path: "step5-dashboard.png" });
  logger.info("Login successful — dashboard loaded");
}

async function handleAttendance(page) {
  logger.info("Looking for attendance button...");

  let button = null;

  // Try role-based selector first (most reliable)
  try {
    const roleBtn = page.getByRole("button", { name: /^sign (in|out)$/i });
    await roleBtn.waitFor({ state: "visible", timeout: 20000 });
    button = roleBtn;
    logger.info("Button found via role selector");
  } catch (_) {
    logger.error("Role selector failed, trying fallbacks...");

    // Fallback selectors for GreyHR's Angular components
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
        logger.info(`Button found via: ${sel}`);
        break;
      } catch (_) {}
    }
  }

  if (!button) {
    await page.screenshot({ path: "no-button.png" });
    const err = new Error(
      "Attendance button not found. GreyHR layout may have changed.",
    );
    err.screenshotPath = "no-button.png";
    throw err;
  }

  const text = ((await button.textContent()) || "").trim();
  logger.info("Button text:", text);

  if (/sign in/i.test(text)) {
    await button.click();
    // await page.waitForTimeout(3000);
    return "Signed In";
  }

  if (/sign out/i.test(text)) {
    await button.click();
    // await page.waitForTimeout(3000);
    return "Signed Out";
  }

  throw new Error(`Unexpected button text: "${text}"`);
}

module.exports = { login, handleAttendance };
