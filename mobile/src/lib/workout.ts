import type { Equipment, MuscleGroup, RecordField, WorkoutSet } from "@/types/models";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Ngực",
  BACK: "Lưng",
  SHOULDERS: "Vai",
  BICEPS: "Tay trước",
  TRICEPS: "Tay sau",
  LEGS: "Chân",
  GLUTES: "Mông",
  CORE: "Bụng",
  FULL_BODY: "Toàn thân",
};

export const MUSCLE_ORDER = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  BARBELL: "Tạ đòn",
  DUMBBELL: "Tạ đơn",
  MACHINE: "Máy",
  CABLE: "Cáp",
  BODYWEIGHT: "Bodyweight",
  KETTLEBELL: "Kettlebell",
  OTHER: "Khác",
};

export const RECORD_LABELS: Record<RecordField, string> = {
  maxWeight: "tạ nặng nhất",
  maxReps: "nhiều rep nhất",
  estimatedOneRepMax: "1RM ước tính",
};

export const DEFAULT_REST_SECONDS = 90;

export function formatWeight(kg: number) {
  return `${kg.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} kg`;
}

export function formatVolume(kg: number) {
  return `${Math.round(kg).toLocaleString("vi-VN")} kg`;
}

// 3725 giây → "1h02p", 540 → "9 phút"
export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}p`;
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
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" });
}
