import { validateActivityMinutes, foodVersion, needsGymSchedule } from '@/lib/personalPlan';
import { buildPersonalPlanReminders } from '@/lib/personalPlanReminders';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import { personalPlanApi } from '@/api/personalPlanApi';
import type { PersonalPlan, PersonalPlanResponse } from '@/types/personalPlan';
jest.mock('@/api/personalPlanApi', () => ({ personalPlanApi: { current: jest.fn(), survey: jest.fn() } }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ user: { id: 'a' }, isAuthenticated: true }) } }));
const plan: PersonalPlan = {
  id: 'p', revision: 0, state: 'PUBLISHED', timezone: 'Asia/Ho_Chi_Minh', startDate: '2026-10-06', endDate: '2026-10-12', sourceSurveyRevision: 1,
  surveySnapshot: { revision: 1, sport: 'YOGA', experience: 'BEGINNER', availableDays: [], mealTimes: [], preferredFoodIds: [], excludedFoodIds: [], remindersEnabled: true },
  targetSnapshot: { id: 't', effectiveFrom: '2026-10-06', calories: 1800, protein: 100, carbs: 200, fat: 60 },
  days: [{ date: '2026-10-06', effective: true, activity: { id: 'a1', sport: 'YOGA', time: '18:00', plannedMinutes: 30, steps: [], status: 'PLANNED' }, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } }],
};
const data: PersonalPlanResponse = { today: '2026-10-06', date: '2026-10-06', timezone: plan.timezone, current: plan, pending: null, expired: false };
beforeEach(() => { jest.clearAllMocks(); usePersonalPlanStore.getState().reset(); jest.mocked(personalPlanApi.survey).mockResolvedValue(plan.surveySnapshot); });
it('validates actual duration and non-gym onboarding without a gym schedule', () => {
  for (const value of ['', '0', '-2', 'NaN', '2.5', '1441']) expect(validateActivityMinutes(value)).toBeNull();
  expect(validateActivityMinutes('25')).toBe(25);
  expect(needsGymSchedule('OTHER', false)).toBe(false);
  expect(needsGymSchedule(undefined, false)).toBe(true);
  expect(needsGymSchedule('GYM', true)).toBe(false);
  expect(foodVersion({ name: 'Rice', servingSize: 100, servingUnit: 'g', calories: 200, protein: 5, carbs: 30, fat: 2, fiber: 1 })).toBe('["Rice",100,"g",200,5,30,2,1]');
});
it('schedules local wall times in plan timezone, with no completed or superseded activities', () => {
  const reminders = buildPersonalPlanReminders(data, new Date('2026-10-06T10:00:00Z'));
  expect(reminders).toHaveLength(1);
  expect(reminders[0].date.toISOString()).toBe('2026-10-06T11:00:00.000Z');
  expect(buildPersonalPlanReminders({ ...data, current: { ...plan, days: [{ ...plan.days[0], effective: false }] } }, new Date('2026-10-06T10:00:00Z'))).toEqual([]);
  expect(buildPersonalPlanReminders(data, new Date('2026-10-06T12:00:00Z'))).toEqual([]);
});
it('schedules every future activation rather than omitting the nearest pending plan', () => {
  const a = { ...plan, id: 'a', days: [{ ...plan.days[0], date: '2026-10-08' }] };
  const b = { ...plan, id: 'b', days: [{ ...plan.days[0], date: '2026-10-10' }] };
  const reminders = buildPersonalPlanReminders({ ...data, current: null, pending: a, upcoming: [a, b] }, new Date('2026-10-06T10:00:00Z'));
  expect(reminders.map(r => r.date.toISOString())).toEqual(['2026-10-08T11:00:00.000Z', '2026-10-10T11:00:00.000Z']);
});
it('discards late plan responses after logout/reset', async () => {
  let resolve!: (value: PersonalPlanResponse) => void;
  jest.mocked(personalPlanApi.current).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const pending = usePersonalPlanStore.getState().load();
  usePersonalPlanStore.getState().reset();
  resolve(data); await pending;
  expect(usePersonalPlanStore.getState().data).toBeNull();
  expect(usePersonalPlanStore.getState().survey).toBeNull();
});
it('reports load errors and recovers without retaining an error', async () => {
  jest.mocked(personalPlanApi.current).mockRejectedValueOnce(new Error('offline'));
  await usePersonalPlanStore.getState().load();
  expect(usePersonalPlanStore.getState().error).toBeTruthy();
  jest.mocked(personalPlanApi.current).mockResolvedValueOnce(data);
  await usePersonalPlanStore.getState().load();
  expect(usePersonalPlanStore.getState().data?.current?.id).toBe('p');
  expect(usePersonalPlanStore.getState().error).toBeNull();
});
