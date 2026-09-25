import type { Food, MealType, NutritionValues, ServingUnit } from "@/types/models";

export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: "Bữa sáng",
  LUNCH: "Bữa trưa",
  DINNER: "Bữa tối",
  SNACK: "Ăn vặt",
};

export const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export const UNIT_LABELS: Record<ServingUnit, string> = { g: "g", ml: "ml", piece: "cái" };

// Gợi ý bữa theo giờ hiện tại khi mở màn thêm món
export function mealTypeForHour(hour: number): MealType {
  if (hour < 10) return "BREAKFAST";
  if (hour < 14) return "LUNCH";
  if (hour < 17) return "SNACK";
  return "DINNER";
}

const round1 = (value: number) => Math.round(value * 10) / 10;

// Chỉ để xem trước trên UI. Số chính thức luôn do server tính khi lưu log.
export function previewNutrition(food: Food, quantity: number): NutritionValues | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const factor = quantity / food.servingSize;
  return {
    calories: round1(food.calories * factor),
    protein: round1(food.protein * factor),
    carbs: round1(food.carbs * factor),
    fat: round1(food.fat * factor),
    fiber: round1(food.fiber * factor),
  };
}

export function formatServing(quantity: number, unit: ServingUnit) {
  return `${quantity.toLocaleString("vi-VN")} ${UNIT_LABELS[unit]}`;
}

// Ngày dạng YYYY-MM-DD, cộng trừ theo lịch (không phụ thuộc múi giờ máy)
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function formatDayLabel(date: string, today: string) {
  if (date === today) return "Hôm nay";
  if (date === addDays(today, -1)) return "Hôm qua";
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}
