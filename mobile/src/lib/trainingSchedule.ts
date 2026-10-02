import type { TrainingDayStatus } from '@/types/trainingSchedule';
export function defaultTrainingDays(preset: { key: string; days: { dayOfWeek: number }[] }) {
  return /upper/i.test(preset.key) && preset.days.length === 4 ? [1, 2, 5, 6] : preset.days.map(d => d.dayOfWeek);
}
export function mapTrainingDays(templateIds: string[], weekdays: number[]) {
  if (weekdays.length !== templateIds.length || new Set(weekdays).size !== weekdays.length || weekdays.some(d => d < 1 || d > 7 || !Number.isInteger(d))) {
    throw new Error(`Chọn đúng ${templateIds.length} ngày tập khác nhau.`);
  }
  return [...weekdays].sort((a,b) => a-b).map((dayOfWeek, i) => ({ dayOfWeek, templateId: templateIds[i] }));
}
export function scheduleRequestId() { return `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export const trainingStatusLabel: Record<TrainingDayStatus, string> = {
  NO_PLAN: 'Chưa có lịch', REST: 'Ngày nghỉ', PLANNED: 'Dự kiến', IN_PROGRESS: 'Đang tập', COMPLETED: 'Đã hoàn thành', MISSED: 'Đã bỏ lỡ',
};
