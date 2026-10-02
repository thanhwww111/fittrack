import type { ApiSuccess } from "@/types/api";
import type { FoodEstimateResult, MealSuggestionResult, MealType, WorkoutAnalysis } from "@/types/models";
import { api, unwrap } from "./client";

export const aiApi = {
  estimateFood: (input: { description: string }) =>
    unwrap(api.post<ApiSuccess<FoodEstimateResult>>("/ai/food-estimates", input)),

  suggestMeals: (input: { mealType: MealType; preferences?: string }) =>
    unwrap(api.post<ApiSuccess<MealSuggestionResult>>("/ai/meal-suggestions", input)),

  analyzeWorkouts: () => unwrap(api.post<ApiSuccess<WorkoutAnalysis>>("/ai/workout-analysis")),
};
