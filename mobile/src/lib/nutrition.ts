import { localeTag , translate as t } from "@/i18n";
import type { DefaultMealType, Food, MealOption, MealType, NutritionValues, ServingUnit } from "@/types/models";

export const MEAL_LABELS: Record<DefaultMealType, string> = {
  get BREAKFAST() { return t("Bữa sáng"); },
  get LUNCH() { return t("Bữa trưa"); },
  get DINNER() { return t("Bữa tối"); },
  get SNACK() { return t("Ăn vặt"); },
};

export const MEAL_ORDER: DefaultMealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export const DEFAULT_MEALS: MealOption[] = MEAL_ORDER.map((id) => ({ id, get name() { return MEAL_LABELS[id]; }, isCustom: false }));

export function isMealType(value: string | undefined): value is MealType {
  return !!value && (MEAL_ORDER.includes(value as DefaultMealType) || /^CUSTOM_[a-f0-9]{24}$/.test(value));
}

export function mealLabel(id: MealType, meals: MealOption[] = DEFAULT_MEALS) {
  if (MEAL_ORDER.includes(id as DefaultMealType)) return MEAL_LABELS[id as DefaultMealType];
  return meals.find((meal) => meal.id === id)?.name ?? t("Bữa tùy chọn");
}

export const UNIT_LABELS: Record<ServingUnit, string> = { g: "g", ml: "ml", get piece() { return t("cái"); } };

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
  return `${quantity.toLocaleString(localeTag())} ${UNIT_LABELS[unit]}`;
}

// Ngày dạng YYYY-MM-DD, cộng trừ theo lịch (không phụ thuộc múi giờ máy)
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function formatDayLabel(date: string, today: string) {
  if (date === today) return t("Hôm nay");
  if (date === addDays(today, -1)) return t("Hôm qua");
  const d = new Date(`${date}T00:00:00Z`);
  if (localeTag() === "en-US") return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}
