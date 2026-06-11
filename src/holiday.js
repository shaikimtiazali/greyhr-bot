const holidays = require("./holidays");
const logger = require("./utils/logger");

// ── FIX: was using local time, must use IST explicitly ──
// On Render (UTC), new Date().getDay() returns UTC day, not IST day
// E.g. Sunday IST midnight = Saturday UTC — would not skip correctly

function getTodayIST() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  return ist;
}

function getTodayDate() {
  const ist = getTodayIST();
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayDayName() {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[getTodayIST().getDay()]; // ← uses IST day, not UTC day
}

function shouldSkipToday() {
  const dayName = getTodayDayName();
  const today = getTodayDate();
  logger.info(`Checking skip: ${dayName} ${today} (IST)`); // visible in logs

  if (dayName === "Saturday" || dayName === "Sunday") {
    return {
      skip: true,
      reason: `Today is ${dayName} (IST). Skipping attendance.`,
    };
  }

  const holiday = holidays.find((h) => h.holidayDate === today);
  if (holiday) {
    return {
      skip: true,
      reason: `Today is a public holiday: ${holiday.description} (${today}). Skipping attendance.`,
    };
  }

  return { skip: false, reason: "" };
}

module.exports = shouldSkipToday;
