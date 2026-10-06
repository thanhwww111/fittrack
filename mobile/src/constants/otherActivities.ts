import type { PlanSport } from '@/types/personalPlan';

// Only list sports supported by the plan API and activity guides.
export const OTHER_ACTIVITY_OPTIONS: { value: PlanSport; label: string }[] = [
  { value: 'WALKING', label: 'Đi bộ' },
  { value: 'YOGA', label: 'Yoga' },
];
export function isOtherActivity(value: unknown): value is PlanSport {
  return typeof value === 'string' && OTHER_ACTIVITY_OPTIONS.some(option => option.value === value);
}
