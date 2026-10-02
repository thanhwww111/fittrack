import { MEAL_TYPES } from "./enums";

export const DEFAULT_MEALS = [
  { id: "BREAKFAST", name: "Bữa sáng", isCustom: false },
  { id: "LUNCH", name: "Bữa trưa", isCustom: false },
  { id: "DINNER", name: "Bữa tối", isCustom: false },
  { id: "SNACK", name: "Ăn vặt", isCustom: false },
];

export function isMealId(value: string): boolean {
  return (MEAL_TYPES as readonly string[]).includes(value) || /^CUSTOM_[a-f0-9]{24}$/.test(value);
}
