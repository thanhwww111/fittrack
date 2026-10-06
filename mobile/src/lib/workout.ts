import { localeTag , translate as t } from "@/i18n";
import type { Equipment, MuscleGroup, RecordField, WorkoutSet } from "@/types/models";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  get CHEST() { return t("Ngực"); },
  get BACK() { return t("Lưng"); },
  get SHOULDERS() { return t("Vai"); },
  get BICEPS() { return t("Tay trước"); },
  get TRICEPS() { return t("Tay sau"); },
  get LEGS() { return t("Chân"); },
  get GLUTES() { return t("Mông"); },
  get CORE() { return t("Bụng"); },
  get FULL_BODY() { return t("Toàn thân"); },
};

export const MUSCLE_ORDER = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  get BARBELL() { return t("Tạ đòn"); },
  get DUMBBELL() { return t("Tạ đơn"); },
  get MACHINE() { return t("Máy"); },
  get CABLE() { return t("Cáp"); },
  BODYWEIGHT: "Bodyweight",
  KETTLEBELL: "Kettlebell",
  get OTHER() { return t("Khác"); },
};

export const RECORD_LABELS: Record<RecordField, string> = {
  get maxWeight() { return t("tạ nặng nhất"); },
  get maxReps() { return t("nhiều rep nhất"); },
  get estimatedOneRepMax() { return t("1RM ước tính"); },
};

export const DEFAULT_REST_SECONDS = 90;

export function formatWeight(kg: number) {
  return `${kg.toLocaleString(localeTag(), { maximumFractionDigits: 2 })} kg`;
}

export function formatVolume(kg: number) {
  return `${Math.round(kg).toLocaleString(localeTag())} kg`;
}

// 3725 giây → "1h02p", 540 → "9 phút"
export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("{value1} phút", { value1: minutes });
  return t("{hours}h{minutes}p", { hours: Math.floor(minutes / 60), minutes: String(minutes % 60).padStart(2, "0") });
}

// Đồng hồ đang chạy: 65 → "01:05", 3725 → "1:02:05"
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function setVolume(sets: WorkoutSet[]) {
  return sets.reduce((sum, s) => sum + (s.completed === false ? 0 : s.weight * s.reps), 0);
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(localeTag(), { weekday: "short", day: "numeric", month: "numeric" });
}
