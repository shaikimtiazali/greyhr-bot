require("dotenv").config({ override: true });

async function login(page) {
  console.log("🔐 Logging into GreyHR...");

  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "domcontentloaded",
  });

  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.fill("#password", process.env.GREYHR_PASSWORD);

  // Click login (no navigation wait)
  await page.click("button[type='submit']");

  // ✅ Wait for dashboard (robust)
  await Promise.race([
    page.waitForSelector("text=Sign In", { timeout: 20000 }),
    page.waitForSelector("text=Sign Out", { timeout: 20000 }),
    page.waitForSelector("gt-button", { timeout: 20000 }),
  ]);

  console.log("✅ Login successful");
}

async function handleAttendance(page) {
  await page.waitForLoadState("networkidle");

  const button = page.getByRole("button", {
    name: /sign in|sign out/i,
  });

  await button.waitFor({ timeout: 20000 });

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

  await page.waitForTimeout(3000);

  return action;
}

module.exports = { login, handleAttendance };
