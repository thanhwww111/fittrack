import { localeTag , translate as t } from "@/i18n";
import type { DayAdherence } from "@/types/models";

// "+8,2%" / "-3%" / "0%"
export function formatSignedPercent(value: number) {
  const text = Math.abs(value).toLocaleString(localeTag(), { maximumFractionDigits: 1 });
  if (value > 0) return `+${text}%`;
  if (value < 0) return `-${text}%`;
  return "0%";
}

// Chưa có ngày nào để chấm (chưa có target, hoặc mới sáng thứ Hai) thì hiện "—"
export function formatDayAdherence({ met, days, percent }: DayAdherence) {
  if (percent === null) return { value: "—", hint: t("chưa có dữ liệu") };
  return { value: `${percent}%`, hint: t("{value1}/{value2} ngày", { value1: met, value2: days }) };
}
