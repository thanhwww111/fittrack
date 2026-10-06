import { vi } from 'vitest';
import { llm } from '../../src/services/ai/llm';
import { coachConsent } from '../../src/services/ai/coachConsent';
export function mockCoachPlan() {
  coachConsent.enabled = true;
  return vi.spyOn(llm, 'generateJson').mockImplementation(async ({ prompt }) => {
    const context = JSON.parse(prompt);
    return { summary: 'Personalized seven-day draft.', days: context.schedule.map((day: any) => ({ date: day.date, coachNote: 'Adapt to your energy today.', activity: day.availability ? { plannedMinutes: day.availability.durationMinutes, focus: 'Comfortable movement', intensity: 'EASY' } : null, meals: context.meals.map((meal: any) => ({ mealId: meal.mealId, items: context.foods.length ? [{ foodId: context.foods[0].id, quantity: context.foods[0].servingSize }] : [] })) })) } as any;
  });
}
