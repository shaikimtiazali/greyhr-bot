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
    page.waitForSelector("text=Sign In", { timeout: 30000 }),
    page.waitForSelector("text=Sign Out", { timeout: 30000 }),
    page.waitForSelector("text=Attendance", { timeout: 30000 }),
    page.waitForSelector("gt-button", { timeout: 30000 }),
  ]);

  console.log("✅ Login successful");
}

async function handleAttendance(page) {
  console.log("⏳ Waiting for attendance button...");

  // Give UI time to fully render
  await page.waitForTimeout(4000);

  let button;

  try { 
    // Try best selector
    button = page.getByRole("button", {
      name: /sign in|sign out/i,
    });

    await button.waitFor({ timeout: 15000 });
  } catch (err) {
    console.log("⚠️ Role selector failed, trying fallback...");

    // Fallback for GreyHR Angular
    button = page.locator("gt-button:has-text('Sign')");
    await button.waitFor({ timeout: 15000 });
  }

  const text = (await button.textContent()) || "";
  console.log("Detected button:", text);

  if (text.toLowerCase().includes("sign in")) {
    await button.click();
    return "Signed In";
  }

  if (text.toLowerCase().includes("sign out")) {
    await button.click();
    return "Signed Out";
  }

  throw new Error("Sign button not found");
}

module.exports = { login, handleAttendance };
