import { defaultTrainingDays, mapTrainingDays } from '@/lib/trainingSchedule';

it('defaults upper lower to Monday Tuesday Friday Saturday', () => {
  expect(defaultTrainingDays({ key: 'upper-lower', days: [1, 2, 4, 5].map(dayOfWeek => ({ dayOfWeek })) })).toEqual([1, 2, 5, 6]);
});
it('assigns ordered sessions to sorted weekdays without mutating selection', () => {
  const days = [6, 1, 5, 2];
  expect(mapTrainingDays(['upper1', 'lower1', 'upper2', 'lower2'], days)).toEqual([
    { dayOfWeek: 1, templateId: 'upper1' }, { dayOfWeek: 2, templateId: 'lower1' },
    { dayOfWeek: 5, templateId: 'upper2' }, { dayOfWeek: 6, templateId: 'lower2' },
  ]);
  expect(days).toEqual([6, 1, 5, 2]);
});
it('rejects missing, repeated or invalid weekdays', () => {
  expect(() => mapTrainingDays(['a','b'], [1])).toThrow();
  expect(() => mapTrainingDays(['a','b'], [1,1])).toThrow();
  expect(() => mapTrainingDays(['a'], [0])).toThrow();
});
