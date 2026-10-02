import { useEffect } from "react";
import { useMealStore } from "@/stores/mealStore";

export function useMeals() {
  const state = useMealStore();
  useEffect(() => { void useMealStore.getState().load(); }, []);
  return state;
}
