require("dotenv").config({ override: true, quiet: true });

const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");

// All screenshots saved here — folder is in .gitignore
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

  const deadline = Date.now() + 90000;

  while (Date.now() < deadline) {
    const url = page.url();
    const signOutCount = await page
      .locator("button:has-text('Sign Out'), gt-button:has-text('Sign Out')")
      .count();
    const signInCount = await page
      .locator("button:has-text('Sign In'), gt-button:has-text('Sign In')")
      .count();

    logger.info(`Polling — SignIn: ${signInCount} | SignOut: ${signOutCount} `);

    if ((signOutCount > 0 || signInCount > 0) && !url.includes("/login")) {
      break;
    }

    if (
      url.includes("/login") &&
      Date.now() > deadline - 80000 &&
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

    if (Date.now() >= deadline) {
      const p = ss("login-timeout.png");
      await page.screenshot({ path: p });
      const err = new Error(
        "Dashboard did not load within 90s — OAuth redirect may have failed.",
      );
      err.screenshotPath = p;
      throw err;
    }
  }

  await page.screenshot({ path: ss("dashboard.png") });
  logger.info("Login successful");
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
