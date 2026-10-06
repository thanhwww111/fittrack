import type { Food } from '@/types/models';
import { parseNumber } from './formErrors';
export function validateActivityMinutes(text: string): number | null {
  const value = parseNumber(text);
  return value !== null && Number.isInteger(value) && value > 0 && value <= 1440 ? value : null;
}
export const needsGymSchedule = (mode: 'GYM' | 'OTHER' | undefined, hasSchedule: boolean) => mode !== 'OTHER' && !hasSchedule;
export const foodVersion = (food: Pick<Food, 'name' | 'servingSize' | 'servingUnit' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>) => JSON.stringify([food.name, food.servingSize, food.servingUnit, food.calories, food.protein, food.carbs, food.fat, food.fiber]);
export const newPlanRequestId = () => `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function resizePlannedItem(item: import("@/types/personalPlan").PlannedItem, quantity: number) {
  const [, servingSize, , calories, protein, carbs, fat, fiber] = JSON.parse(item.foodVersion) as [string, number, string, number, number, number, number, number];
  const factor = Number.isFinite(quantity) && quantity > 0 ? quantity / servingSize : 0;
  const rounded = (value: number) => Math.round(value * factor * 10) / 10;
  return { ...item, quantity, calories: rounded(calories), protein: rounded(protein), carbs: rounded(carbs), fat: rounded(fat), fiber: rounded(fiber) };
}
