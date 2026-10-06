import { Types } from 'mongoose';
import { addDays } from './date';
import { calculateNutrition, sumNutrition, type NutritionValues } from './foodNutrition';
import { activitySteps } from '../constants/activityGuides';
import type { SurveyInput } from '../schemas/personalPlan.schema';
export interface PlanFood extends NutritionValues { id: string; name: string; servingSize: number; servingUnit: string }
export interface PlanItem extends NutritionValues { id: string; foodId: string; foodName: string; servingUnit: string; quantity: number; foodVersion: string; logId?: string }
export interface PlanActivity { focus?: string; intensity?: 'EASY' | 'MODERATE'; id: string; sport: 'YOGA' | 'WALKING'; time: string; plannedMinutes: number; steps: ReturnType<typeof activitySteps>; status?: string; actualMinutes?: number; note?: string; revision?: number }
export interface PlanDay { coachNote?: string; date: string; activity: PlanActivity | null; meals: { mealId: string; time: string; items: PlanItem[] }[]; totals: NutritionValues; effective?: boolean }
export interface TargetSnapshot { id: string; effectiveFrom: string; calories: number; protein: number; carbs: number; fat: number }
export const foodVersion = (food: Omit<PlanFood, 'id'>) => JSON.stringify([food.name, food.servingSize, food.servingUnit, food.calories, food.protein, food.carbs, food.fat, food.fiber]);
export function planItem(food: PlanFood, quantity: number, id = new Types.ObjectId().toString()): PlanItem {
  return { id, foodId: food.id, foodName: food.name, servingUnit: food.servingUnit, quantity, foodVersion: foodVersion(food), ...calculateNutrition(food, quantity) };
}
export function buildPlanDays(startDate: string, survey: SurveyInput, library: PlanFood[], target: TargetSnapshot): PlanDay[] {
  const foods = library.filter(f => !survey.excludedFoodIds.includes(f.id) && f.calories > 0)
    .sort((a, b) => Number(survey.preferredFoodIds.includes(b.id)) - Number(survey.preferredFoodIds.includes(a.id)) || b.protein / b.calories - a.protein / a.calories || a.id.localeCompare(b.id));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    const weekday = new Date(date + 'T12:00:00Z').getUTCDay() || 7;
    const slot = survey.availableDays.find(d => d.dayOfWeek === weekday);
    const meals = survey.mealTimes.map((meal, j) => {
      const food = foods.length ? foods[(i + j) % Math.min(foods.length, 12)] : undefined;
      // Bounded portions are suggestions, not a claim that all targets are met.
      const quantity = food ? Math.min(10000, Math.max(.01, Math.round(food.servingSize * Math.min(3, target.calories / survey.mealTimes.length / food.calories) * 100) / 100)) : 0;
      return { ...meal, items: food ? [planItem(food, quantity)] : [] };
    });
    return { date, activity: slot ? { id: new Types.ObjectId().toString(), sport: survey.sport, time: slot.time, plannedMinutes: slot.durationMinutes, steps: activitySteps(survey.sport, slot.durationMinutes) } : null, meals, totals: sumNutrition(meals.flatMap(m => m.items)) };
  });
}
