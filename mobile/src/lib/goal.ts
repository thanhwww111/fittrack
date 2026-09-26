import type { GoalRateStatus, WeeklyProgram } from "@/types/models";

// "+0,25 kg/tuần" / "-0,5 kg/tuần" / "0 kg/tuần"
export function formatRate(rate: number) {
  const text = Math.abs(rate).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  const sign = rate > 0 ? "+" : rate < 0 ? "-" : "";
  return `${sign}${text} kg/tuần`;
}

const STATUS_TEXT: Record<GoalRateStatus, string> = {
  ON_TRACK: "Đúng tiến độ 👍",
  TOO_SLOW: "Chậm hơn mục tiêu",
  TOO_FAST: "Nhanh hơn mục tiêu, cân nhắc giảm tốc",
  WRONG_DIRECTION: "Đang đi ngược hướng mục tiêu",
  OFF_TRACK: "Cân nặng đang dao động nhiều",
  NOT_ENOUGH_DATA: "Cân ít nhất 2 tuần để xem xu hướng",
};

export function goalStatusText(status: GoalRateStatus) {
  return STATUS_TEXT[status];
}

// dayOfWeek: 1 = thứ Hai ... 7 = Chủ nhật
const DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export function dayName(dayOfWeek: number) {
  return DAY_NAMES[dayOfWeek - 1];
}

export function programDayFor(program: WeeklyProgram, dayOfWeek: number) {
  return program.days.find((d) => d.dayOfWeek === dayOfWeek) ?? null;
}
