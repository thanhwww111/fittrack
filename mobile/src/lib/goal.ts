import { localeTag , translate as t } from "@/i18n";
import type { GoalRateStatus, WeeklyProgram } from "@/types/models";

// "+0,25 kg/tuần" / "-0,5 kg/tuần" / "0 kg/tuần"
export function formatRate(rate: number) {
  const text = Math.abs(rate).toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  const sign = rate > 0 ? "+" : rate < 0 ? "-" : "";
  return t("{value1}{value2} kg/tuần", { value1: sign, value2: text });
}

const STATUS_TEXT: Record<GoalRateStatus, string> = {
  get ON_TRACK() { return t("Đúng tiến độ 👍"); },
  get TOO_SLOW() { return t("Chậm hơn mục tiêu"); },
  get TOO_FAST() { return t("Nhanh hơn mục tiêu, cân nhắc giảm tốc"); },
  get WRONG_DIRECTION() { return t("Đang đi ngược hướng mục tiêu"); },
  get OFF_TRACK() { return t("Cân nặng đang dao động nhiều"); },
  get NOT_ENOUGH_DATA() { return t("Cân ít nhất 2 tuần để xem xu hướng"); },
};

export function goalStatusText(status: GoalRateStatus) {
  return STATUS_TEXT[status];
}

// dayOfWeek: 1 = thứ Hai ... 7 = Chủ nhật
const DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export function dayName(dayOfWeek: number) {
  return t(DAY_NAMES[dayOfWeek - 1] ?? "");
}

export function programDayFor(program: WeeklyProgram, dayOfWeek: number) {
  return program.days.find((d) => d.dayOfWeek === dayOfWeek) ?? null;
}
