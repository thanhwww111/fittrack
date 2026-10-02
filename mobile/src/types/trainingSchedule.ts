import type { TemplateExerciseInput } from './models';
export type TrainingDayStatus = 'NO_PLAN' | 'REST' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
export interface TrainingScheduleSnapshot {
  id: string; programId: string; name: string; effectiveFrom: string; timezone: string;
  days: { dayOfWeek: number; templateId: string; templateName: string; exerciseCount: number; exercises: TemplateExerciseInput[] }[];
}
export interface TrainingScheduleDay {
  date: string; timezone?: string; status: TrainingDayStatus;
  workout: { templateId: string; templateName: string; exerciseCount: number } | null;
  sessionId: string | null;
}
export interface TrainingScheduleResponse {
  today: string; timezone: string; current: TrainingScheduleSnapshot | null;
  pending: TrainingScheduleSnapshot | null; days: TrainingScheduleDay[];
}
