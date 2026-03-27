const holidays = require("./holidays");

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function isHoliday() {
  const today = getTodayDate();

  const holiday = holidays.find((h) => h.holidayDate === today);

  if (holiday) {
    return {
      isHoliday: true,
      name: holiday.description,
    };
  }

  return { isHoliday: false };
}

module.exports = isHoliday;
