import { beforeEach, describe, expect, it, vi } from 'vitest';
import { llm } from '../src/services/ai/llm';
import { generatePersonalPlan } from '../src/services/ai/personalPlanGenerator';
import { addDays } from '../src/utils/date';
import type { SurveyInput } from '../src/schemas/personalPlan.schema';
vi.mock('../src/services/ai/llm', () => ({ llm: { generateJson: vi.fn() } }));
const food = { id: '123456789012345678901234', name: 'Rice', servingSize: 100, servingUnit: 'g', calories: 200, protein: 10, carbs: 30, fat: 5, fiber: 1 };
const survey: SurveyInput = { revision: 1, sport: 'WALKING', experience: 'BEGINNER', availableDays: [{ dayOfWeek: 2, time: '18:00', durationMinutes: 30 }], mealTimes: [{ mealId: 'BREAKFAST', time: '07:00' }, { mealId: 'LUNCH', time: '12:00' }, { mealId: 'DINNER', time: '19:00' }], preferredFoodIds: [], excludedFoodIds: [], remindersEnabled: true };
const target = { id: 'target', effectiveFrom: '2026-10-06', calories: 1800, protein: 100, carbs: 200, fat: 60 };
const input = { startDate: '2026-10-06', survey, foods: [food], target, profile: { goalType: 'WEIGHT_LOSS' }, feedback: [], language: 'vi' as const };
function output() { return { summary: 'Lịch đi bộ nhẹ, tăng dần khi bạn thấy thoải mái.', days: Array.from({ length: 7 }, (_, i) => ({ date: addDays(input.startDate, i), activity: i === 0 ? { plannedMinutes: 25, focus: 'Đi bộ thoải mái', intensity: 'EASY' } : null, coachNote: 'Theo dõi cảm nhận sau buổi và ghi lại.', meals: survey.mealTimes.map(m => ({ mealId: m.mealId, items: [{ foodId: food.id, quantity: 300 }] })) })) }; }
beforeEach(() => vi.clearAllMocks());
describe('AI personal plan validation', () => {
  it('uses model choices and real food macros, preserving availability and AI rationale', async () => {
    vi.mocked(llm.generateJson).mockResolvedValue(output());
    const result = await generatePersonalPlan(input);
    expect(llm.generateJson).toHaveBeenCalledOnce();
    expect(result.summary).toContain('Lịch đi bộ');
    expect(result.days[0].activity?.plannedMinutes).toBe(25);
    expect(result.days[0].totals.calories).toBe(1800);
    expect(result.days[0].activity?.steps.reduce((n, step) => n + step.minutes, 0)).toBe(25);
    expect(result.days[1].activity).toBeNull();
  });
  it('rejects invented food IDs and excessive activity durations', async () => {
    const invented = output(); invented.days[0].meals[0].items[0].foodId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    vi.mocked(llm.generateJson).mockResolvedValueOnce(invented);
    await expect(generatePersonalPlan(input)).rejects.toMatchObject({ statusCode: 502 });
    const excessive = output(); excessive.days[0].activity!.plannedMinutes = 60;
    vi.mocked(llm.generateJson).mockResolvedValueOnce(excessive);
    await expect(generatePersonalPlan(input)).rejects.toMatchObject({ statusCode: 502 });
  });
  it('rejects missing meals, wrong dates and activity on rest days', async () => {
    for (const mutate of [(value: ReturnType<typeof output>) => { value.days[0].meals.pop(); }, (value: ReturnType<typeof output>) => { value.days[0].date = '2026-10-08'; }, (value: ReturnType<typeof output>) => { value.days[1].activity = value.days[0].activity; }]) {
      const value = output(); mutate(value); vi.mocked(llm.generateJson).mockResolvedValueOnce(value);
      await expect(generatePersonalPlan(input)).rejects.toMatchObject({ statusCode: 502 });
    }
  });
  it('shares nutrition targets without internal target identifiers', async () => {
    vi.mocked(llm.generateJson).mockResolvedValue(output());
    await generatePersonalPlan(input);
    const payload = JSON.parse(vi.mocked(llm.generateJson).mock.calls[0][0].prompt);
    expect(payload.target).toEqual({ calories: 1800, protein: 100, carbs: 200, fat: 60 });
  });
  it('reports provider unavailability instead of producing pretend AI', async () => {
    vi.mocked(llm.generateJson).mockRejectedValue(new Error('provider offline'));
    await expect(generatePersonalPlan(input)).rejects.toThrow('provider offline');
  });
});
