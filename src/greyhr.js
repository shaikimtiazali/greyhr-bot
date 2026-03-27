require("dotenv").config({ override: true });

async function login(page) {
  console.log("🔐 Logging into GreyHR...");

  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "domcontentloaded",
  });

  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.fill("#password", process.env.GREYHR_PASSWORD);

  await page.click("button[type='submit']");

  // ✅ WAIT FOR UI (NOT navigation)
  await Promise.race([
    page.waitForSelector("gt-home-dashboard", { timeout: 30000 }),
    page.waitForSelector("text=Sign In", { timeout: 30000 }),
    page.waitForSelector("text=Sign Out", { timeout: 30000 }),
  ]);

  console.log("✅ Login successful");
}

async function handleAttendance(page) {
  console.log("⏳ Waiting for dashboard...");

  // Wait for dashboard container
  await page.waitForSelector("gt-home-dashboard", { timeout: 30000 });

  console.log("✅ Dashboard loaded");

  // Extra buffer (important for GreyHR)
  await page.waitForTimeout(3000);

  // Now find button
  const button = page.getByRole("button", {
    name: /sign in|sign out/i,
  });

  await button.waitFor({ timeout: 30000 });

  const text = (await button.textContent()) || "";
  console.log("Detected button:", text);

  let action = "";

  if (text.toLowerCase().includes("sign in")) {
    await button.click();
    action = "Signed In";
  } else if (text.toLowerCase().includes("sign out")) {
    await button.click();
    action = "Signed Out";
  } else {
    throw new Error("Unknown button state");
  }

  return action;
}

module.exports = { login, handleAttendance };
