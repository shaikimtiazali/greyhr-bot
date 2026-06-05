require("dotenv").config({ override: true, quiet: true });

const launchBrowser = require("../browser");
const { login, handleAttendance } = require("../greyhr");
const sendMail = require("../mailer");
const shouldSkipToday = require("../holiday");
const logger = require("../utils/logger");

(async () => {
  // ─── Step 1: Check weekend / holiday BEFORE launching browser ───────────────
  const { skip, reason } = shouldSkipToday();

  if (skip) {
    logger.info(`${reason}`);
    await sendMail("GreyHR Skipped", reason);
    process.exit(0);
  }

  // ─── Step 2: Launch browser ──────────────────────────────────────────────────
  let browser;
  let page;

  try {
    ({ browser, page } = await launchBrowser());
  } catch (launchErr) {
    logger.error("Failed to launch browser:", launchErr.message);
    await sendMail(
      "GreyHR Failure – Browser Launch Error",
      `Could not launch browser.\n\nError: ${launchErr.message}`,
    );
    process.exit(1);
  }

  // ─── Step 3: Login + Attendance ──────────────────────────────────────────────
  try {
    logger.info("Starting GreyHR automation...");

    await login(page);

    const action = await handleAttendance(page);

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const message = `GreyHR ${action} successful at ${now} (IST)`;

    logger.info(message);

    await sendMail(`GreyHR – ${action} Successful`, message);
  } catch (err) {
    logger.error("Automation failed: " + (err.message || "Unknown error"));
    const screenshotPath = err.screenshotPath || null;
    if (!screenshotPath) {
      screenshotPath = "error.png";
      try {
        await page.screenshot({ path: screenshotPath });
      } catch (ssErr) {
        screenshotPath = null;
      }
    }

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const errorBody = [
      `GreyHR automation failed at ${now} (IST).`,
      ``,
      `Error: ${err.message}`,
      ``,
      `Please check the attached screenshot for details.`,
    ].join("\n");

    await sendMail("GreyHR – Attendance Failed", errorBody, screenshotPath);

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
