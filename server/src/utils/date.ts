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

// Các hàm dưới đây làm việc với chuỗi YYYY-MM-DD như ngày lịch thuần,
// tính bằng UTC để không bị lệch vì múi giờ của server

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

// Thứ Hai của tuần chứa `date`
export function startOfWeek(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Chủ nhật
  return addDays(date, -((day + 6) % 7));
}

// Danh sách ngày từ `from` đến `to`, tính cả hai đầu
export function dateRange(from: string, to: string) {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
