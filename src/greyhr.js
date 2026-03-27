require("dotenv").config();

async function login(page) {
  console.log("🔐 Logging into GreyHR...");

  await page.goto(process.env.GREYHR_URL, {
    waitUntil: "networkidle",
  });

  await page.fill("#username", process.env.GREYHR_USERNAME);
  await page.fill("#password", process.env.GREYHR_PASSWORD);

  await Promise.all([
    page.click("button[type='submit']"),
    page.waitForNavigation(),
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
