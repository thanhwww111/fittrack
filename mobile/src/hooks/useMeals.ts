import { useEffect } from "react";
import { useMealStore } from "@/stores/mealStore";
import { useTranslation } from "@/i18n";
import { mealLabel } from "@/lib/nutrition";

export function useMeals() {
  "use no memo"; // mealLabel reads the external language preference.
  useTranslation();
  const state = useMealStore();
  useEffect(() => { void useMealStore.getState().load(); }, []);
  return { ...state, meals: state.meals.map(meal => meal.isCustom ? meal : { ...meal, name: mealLabel(meal.id) }) };
}
