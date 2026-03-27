const launchBrowser = require("../browser");
const { login, handleAttendance } = require("../greyhr");
const sendMail = require("../mailer");
const isHoliday = require("../holiday");

(async () => {
  const { browser, page } = await launchBrowser();

  try {
    console.log("Starting GreyHR automation...");

    // 🎉 Holiday Check FIRST (no login needed)
    const holiday = isHoliday();

    if (holiday.isHoliday) {
      const msg = `Today is a holiday: ${holiday.name}. Skipping attendance.`;

      console.log(msg);

      await sendMail("GreyHR Holiday", msg);
      return;
    }

    // 🔐 Login only if working day
    await login(page);

    // ✅ Attendance
    const action = await handleAttendance(page);

    const message = `GreyHR ${action} successful at ${new Date().toLocaleString()}`;

    console.log(message);

    await sendMail("GreyHR Success", message);
  } catch (err) {
    console.error("Error:", err.message);

    await page.screenshot({ path: "error.png" });

    await sendMail("GreyHR Failure", `Error: ${err.message}`);

    process.exit(1);
  } finally {
    await browser.close();
  }
})();
