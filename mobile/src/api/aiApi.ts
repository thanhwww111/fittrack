import type { ApiSuccess } from "@/types/api";
import type { MealSuggestionResult, MealType, WorkoutAnalysis } from "@/types/models";
import { api, unwrap } from "./client";

export const aiApi = {
  suggestMeals: (input: { mealType: MealType; preferences?: string }) =>
    unwrap(api.post<ApiSuccess<MealSuggestionResult>>("/ai/meal-suggestions", input)),

  analyzeWorkouts: () => unwrap(api.post<ApiSuccess<WorkoutAnalysis>>("/ai/workout-analysis")),
};
