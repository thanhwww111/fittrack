import { translate as t } from "@/i18n";
import type { TrainingDayStatus } from '@/types/trainingSchedule';
export function defaultTrainingDays(preset: { key: string; days: { dayOfWeek: number }[] }) {
  return /upper/i.test(preset.key) && preset.days.length === 4 ? [1, 2, 5, 6] : preset.days.map(d => d.dayOfWeek);
}
export function mapTrainingDays(templateIds: string[], weekdays: number[]) {
  if (weekdays.length !== templateIds.length || new Set(weekdays).size !== weekdays.length || weekdays.some(d => d < 1 || d > 7 || !Number.isInteger(d))) {
    throw new Error(t("Chọn đúng {value1} ngày tập khác nhau.", { value1: templateIds.length }));
  }
  return [...weekdays].sort((a,b) => a-b).map((dayOfWeek, i) => ({ dayOfWeek, templateId: templateIds[i] }));
}
export function scheduleRequestId() { return `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export const trainingStatusLabel: Record<TrainingDayStatus, string> = {
  get NO_PLAN() { return t("Chưa có lịch"); }, get REST() { return t("Ngày nghỉ"); }, get PLANNED() { return t("Dự kiến"); }, get IN_PROGRESS() { return t("Đang tập"); }, get COMPLETED() { return t("Đã hoàn thành"); }, get MISSED() { return t("Đã bỏ lỡ"); },
};
