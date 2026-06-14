require("dotenv").config({ override: true, quiet: true });

const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");

const SS_DIR = path.resolve(process.cwd(), "screenshots");
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
const ss = (name) => path.join(SS_DIR, name);

async function login(page) {
  logger.info("Logging into GreyHR...");

  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  logger.info("Page loaded: " + page.url());

  try {
    await page.waitForSelector("text=Just a moment", {
      state: "hidden",
      timeout: 30000,
    });
    logger.info("Splash screen cleared");
  } catch (_) {
    logger.info("No splash screen — continuing");
  }

  await page.waitForSelector("#username", { state: "visible", timeout: 30000 });
  await page.waitForSelector("#password", { state: "visible", timeout: 10000 });
  logger.info("Login form ready");

  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.waitForTimeout(500);
  await page.fill("#password", process.env.GREYHR_PASSWORD);
  await page.waitForTimeout(800);
  logger.info("Credentials filled");

  await page.click("button[type='submit']");
  logger.info("Login submitted — polling for dashboard...");

  // Increased to 120s — Render network is slower than local/GitHub Actions
  const TIMEOUT_MS = 120000;
  const deadline = Date.now() + TIMEOUT_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    const url = page.url();
    const signOutCount = await page
      .locator("button:has-text('Sign Out'), gt-button:has-text('Sign Out')")
      .count();
    const signInCount = await page
      .locator("button:has-text('Sign In'), gt-button:has-text('Sign In')")
      .count();
    const remaining = Math.round((deadline - Date.now()) / 1000);

    logger.info(
      `Poll #${attempt} | SignIn: ${signInCount} | SignOut: ${signOutCount} | ${remaining}s left`,
    );

    // Success — attendance button visible and past the login page
    if ((signOutCount > 0 || signInCount > 0) && !url.includes("/login")) {
      await page.screenshot({ path: ss("dashboard.png") });
      logger.info("Login successful");
      return;
    }

    // Wrong credentials — still on login page after 3 attempts (9s)
    if (
      attempt > 3 &&
      url.includes("/login") &&
      signInCount > 0 &&
      signOutCount === 0
    ) {
      const p = ss("login-failed.png");
      await page.screenshot({ path: p });
      const err = new Error(
        "Login failed — verify GREYHR_USERNAME and GREYHR_PASSWORD.",
      );
      err.screenshotPath = p;
      throw err;
    }

    await page.waitForTimeout(3000);
  }

  // Timed out
  const p = ss("login-timeout.png");
  await page.screenshot({ path: p });
  const err = new Error(
    `Dashboard did not load within ${TIMEOUT_MS / 1000}s — OAuth redirect may have failed.`,
  );
  err.screenshotPath = p;
  throw err;
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
        logger.info("Button found via: " + sel);
        break;
      } catch (_) {}
    }
  }

  if (!button) {
    const p = ss("no-button.png");
    await page.screenshot({ path: p });
    const err = new Error(
      "Attendance button not found — GreyHR layout may have changed.",
    );
    err.screenshotPath = p;
    throw err;
  }

  const text = ((await button.textContent()) || "").trim();
  logger.info("Button text: " + text);

  if (/sign in/i.test(text)) {
    await button.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: ss("signed-in.png") });
    return "Signed In";
  }

  if (/sign out/i.test(text)) {
    await button.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: ss("signed-out.png") });
    return "Signed Out";
  }

  throw new Error("Unexpected button text: " + text);
}

module.exports = { login, handleAttendance };
