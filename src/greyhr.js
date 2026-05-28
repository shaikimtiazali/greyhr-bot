const path = require("path");
require("dotenv").config({ override: true, quiet: true });
const logger = require("./utils/logger");

async function login(page) {
  logger.info("Logging into GreyHR...");

  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "networkidle",
    timeout: 90000, // ← increased from 60s
  });

  // Splash screen — info not error if absent
  try {
    await page.waitForSelector("text=Just a moment", {
      state: "hidden",
      timeout: 30000,
    });
    logger.info("Splash screen cleared");
  } catch (_) {
    logger.info("No splash screen — continuing"); // ← was logger.error, now info
  }

  await page.waitForSelector("#username", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#password", { state: "visible", timeout: 10000 });
  logger.info("Login form ready");

  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.waitForTimeout(500);
  await page.fill("#password", process.env.GREYHR_PASSWORD);
  await page.waitForTimeout(800); // ← slightly longer before submit
  logger.info("Credentials filled");

  // ── KEY FIX: increased navigation timeout to 90s ──
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 90000 }),
    page.click("button[type='submit']"),
  ]);

  // Post-login splash
  try {
    await page.waitForSelector("text=Just a moment", {
      state: "hidden",
      timeout: 20000,
    });
  } catch (_) {}

  // Dashboard detection with better logging
  let dashboardLoaded = false;
  for (let i = 0; i < 6; i++) {
    const url = page.url();
    const signInCount = await page.locator("text=Sign In").count();
    const signOutCount = await page.locator("text=Sign Out").count();
    logger.info(
      `Check ${i + 1}/6 | URL: ${url} | SignIn:${signInCount} SignOut:${signOutCount}`,
    );

    if (url.includes("/login") && signInCount > 0 && signOutCount === 0) {
      await page.screenshot({ path: "step5-loginfailed.png" });
      const err = new Error(
        "Login failed: Still on login page. Verify GREYHR_USERNAME and GREYHR_PASSWORD.",
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

  logger.info("Login successful — dashboard loaded");
}

async function handleAttendance(page) {
  logger.info("Looking for attendance button...");

  let button = null;

  try {
    const roleBtn = page.getByRole("button", { name: /^sign (in|out)$/i });
    await roleBtn.waitFor({ state: "visible", timeout: 20000 });
    button = roleBtn;
    logger.info("Button found via role selector");
  } catch (_) {
    logger.info("Role selector failed, trying fallbacks...");

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
  logger.info(`Button text: ${text}`); // ← fixed logger.info("Button text:", text) → template literal

  if (/sign in/i.test(text)) {
    await button.click();
    await page.waitForTimeout(3000); // ← uncommented — gives time to register
    return "Signed In";
  }

  if (/sign out/i.test(text)) {
    await button.click();
    await page.waitForTimeout(3000); // ← uncommented
    return "Signed Out";
  }

  throw new Error(`Unexpected button text: "${text}"`);
}

module.exports = { login, handleAttendance };
