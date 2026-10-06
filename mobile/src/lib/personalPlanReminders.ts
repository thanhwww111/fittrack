import type { PersonalPlanResponse } from '@/types/personalPlan';
import { zonedDate } from './workoutReminders';
import { translate as t } from '@/i18n';
export function buildPersonalPlanReminders(data: PersonalPlanResponse | null, now = new Date()) {
  if (!data) return [];
  const seen = new Set<string>();
  return [data.current, ...(data.upcoming ?? [data.pending])].flatMap(plan => plan && plan.surveySnapshot.remindersEnabled ? plan.days.flatMap(day => {
    const activity = day.activity;
    if (!day.effective || !activity || (activity.status && activity.status !== 'PLANNED')) return [];
    const date = zonedDate(day.date, activity.time, plan.timezone);
    if (!date || date <= now || seen.has(day.date)) return [];
    seen.add(day.date);
    return [{ id: `plan-${plan.id}-${day.date}-${activity.id}`, date,
      title: t('Kế hoạch hôm nay'), body: t('{sport} · {minutes} phút', { sport: activity.sport === 'YOGA' ? t('Yoga') : t('Đi bộ'), minutes: activity.plannedMinutes }) }];
  }) : []).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 14);
}
