const cron = require("node-cron");
const { execSync } = require("child_process");

const LOG_PREFIX = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `[${ist.toISOString().replace("T", " ").slice(0, 19)} IST]`;
};

const runBot = () => {
  console.log(`${LOG_PREFIX()} Starting GreyHR Bot...`);
  try {
    execSync("node src/actions/run.js", {
      stdio: "inherit",
      env: {
        ...process.env,
        TZ: "Asia/Kolkata",
      },
      timeout: 20 * 60 * 1000, // 20 minutes
    });
    console.log(`${LOG_PREFIX()} Bot finished successfully.`);
  } catch (err) {
    console.error(`${LOG_PREFIX()} Bot failed:`, err.message);
  }
};

// 9:00 AM IST = 3:30 AM UTC → cron in UTC
// 9:00 PM IST = 3:30 PM UTC → cron in UTC
// Render runs in UTC

cron.schedule("30 3 * * 1-5", () => {
  console.log(`${LOG_PREFIX()} Triggered: 9:00 AM IST job`);
  runBot();
});

cron.schedule("30 15 * * 1-5", () => {
  console.log(`${LOG_PREFIX()} Triggered: 9:00 PM IST job`);
  runBot();
});

console.log(
  `${LOG_PREFIX()} Scheduler is running. Waiting for next trigger...`,
);
console.log("Scheduled times (IST): 9:00 AM and 9:00 PM, Mon–Fri");
