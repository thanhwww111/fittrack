import type { GoalType } from "../constants/enums";
import { daysBetween, startOfWeek } from "./date";
import { round1 } from "./foodNutrition";

// Tốc độ mặc định (kg/tuần) khi user chưa tự đặt: tăng cơ chậm để hạn chế tích mỡ,
// giảm cân ~0.5 kg/tuần là mức phổ biến và an toàn
const DEFAULT_GOAL_RATE: Record<GoalType, number> = {
  MUSCLE_GAIN: 0.25,
  WEIGHT_LOSS: 0.5,
  MAINTENANCE: 0,
};

// Giữ cân: dao động trong ±0.2 kg/tuần vẫn tính là ổn định
const MAINTENANCE_TOLERANCE = 0.2;

export type RateStatus =
  | "ON_TRACK"
  | "TOO_SLOW"
  | "TOO_FAST"
  | "WRONG_DIRECTION"
  | "OFF_TRACK"
  | "NOT_ENOUGH_DATA";

export interface WeeklyWeight {
  weekStart: string;
  average: number | null;
  entries: number;
  change: number | null; // so với tuần gần nhất trước đó có dữ liệu
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// kg/tuần có dấu: dương = tăng, âm = giảm
export function targetWeeklyRate(goalType: GoalType, goalRate: number | null | undefined) {
  if (goalType === "MAINTENANCE") return 0;
  const rate = goalRate ?? DEFAULT_GOAL_RATE[goalType];
  return goalType === "WEIGHT_LOSS" ? -rate : rate;
}

// Đã đi được bao nhiêu % quãng đường từ cân lúc bắt đầu đến cân mục tiêu
export function goalProgressPercent(start: number, current: number, goal: number) {
  if (start === goal) return null;
  const percent = ((current - start) / (goal - start)) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)));
}

// Trung bình cân theo tuần (thứ Hai là đầu tuần) để nhìn xu hướng thay vì từng lần cân
export function weeklyAverages(points: { date: string; weight: number }[], weekStarts: string[]) {
  let previous: number | null = null;
  return weekStarts.map((weekStart): WeeklyWeight => {
    const inWeek = points.filter((p) => startOfWeek(p.date) === weekStart);
    if (inWeek.length === 0) return { weekStart, average: null, entries: 0, change: null };

    const average = round1(inWeek.reduce((s, p) => s + p.weight, 0) / inWeek.length);
    const change = previous === null ? null : round1(average - previous);
    previous = average;
    return { weekStart, average, entries: inWeek.length, change };
  });
}

// Tốc độ thực tế (kg/tuần) = độ dốc giữa tuần đầu và tuần cuối có dữ liệu
export function actualWeeklyRate(weeks: WeeklyWeight[]) {
  const withData = weeks.filter((w) => w.average !== null);
  if (withData.length < 2) return null;

  const first = withData[0];
  const last = withData[withData.length - 1];
  const spanWeeks = daysBetween(first.weekStart, last.weekStart) / 7;
  return round2((last.average! - first.average!) / spanWeeks);
}

// Nhanh / chậm tính theo tỷ lệ so với tốc độ mục tiêu: dưới 50% là chậm, trên 150% là nhanh
export function rateStatus(target: number, actual: number | null): RateStatus {
  if (actual === null) return "NOT_ENOUGH_DATA";
  if (target === 0) return Math.abs(actual) <= MAINTENANCE_TOLERANCE ? "ON_TRACK" : "OFF_TRACK";

  const along = actual * Math.sign(target);
  if (along < 0) return "WRONG_DIRECTION";
  const ratio = along / Math.abs(target);
  if (ratio < 0.5) return "TOO_SLOW";
  if (ratio > 1.5) return "TOO_FAST";
  return "ON_TRACK";
}
