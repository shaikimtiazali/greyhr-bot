import { execSync } from "child_process";

console.log("Manual test run triggered...");
execSync("node src/actions/run.js", {
  stdio: "inherit",
  env: { ...process.env, TZ: "Asia/Kolkata" },
  timeout: 15 * 60 * 1000,
});
