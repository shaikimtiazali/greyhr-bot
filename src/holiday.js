const holidays = require("./holidays");

/**
 * Returns today's date in YYYY-MM-DD format (local time).
 */
function getTodayDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the day of week name for today.
 */
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
  return days[new Date().getDay()];
}

/**
 * Checks if today should be skipped (weekend or public holiday).
 * @returns {{ skip: boolean, reason: string }}
 */
function shouldSkipToday() {
  const dayName = getTodayDayName();

  // Skip Saturday and Sunday
  if (dayName === "Saturday" || dayName === "Sunday") {
    return { skip: true, reason: `Today is ${dayName}. Skipping attendance.` };
  }

  // Check public holidays
  const today = getTodayDate();
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
