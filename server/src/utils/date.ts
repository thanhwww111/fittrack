export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Ngày hiện tại (YYYY-MM-DD) theo múi giờ của user, không theo giờ server
export function todayInTimezone(timezone: string, now = new Date()) {
  // en-CA format sẵn dạng YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidDateString(value: string) {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
