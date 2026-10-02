import { create } from "zustand";
import { mealApi } from "@/api/nutritionApi";
import { errorMessage } from "@/lib/formErrors";
import { DEFAULT_MEALS } from "@/lib/nutrition";
import type { MealOption } from "@/types/models";

interface MealState {
  meals: MealOption[];
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (name: string) => Promise<MealOption>;
  reset: () => void;
}

let generation = 0;
let pending: Promise<void> | null = null;

export const useMealStore = create<MealState>()((set) => ({
  meals: DEFAULT_MEALS,
  loaded: false,
  error: null,
  load: () => {
    if (pending) return pending;
    const current = generation;
    pending = mealApi.list().then((meals) => {
      if (current !== generation) return;
      // Bữa vừa tạo trong lúc GET đang chạy không bị response cũ ghi đè.
      set((state) => ({
        meals: [...new Map([...meals, ...state.meals].map((meal) => [meal.id, meal])).values()],
        loaded: true, error: null,
      }));
    }).catch((err) => {
      if (current === generation) set({ error: errorMessage(err) });
    }).finally(() => {
      if (current === generation) pending = null;
    });
    return pending;
  },
  add: async (name) => {
    const current = generation;
    const meal = await mealApi.create(name);
    if (current === generation) set((state) => ({
      meals: [...state.meals.filter((item) => item.id !== meal.id), meal], error: null,
    }));
    return meal;
  },
  reset: () => {
    generation += 1;
    pending = null;
    set({ meals: DEFAULT_MEALS, loaded: false, error: null });
  },
}));
