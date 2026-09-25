import type { ApiSuccess } from "@/types/api";
import type { DailyNutrition, FoodLog, MealType } from "@/types/models";
import { api, unwrap } from "./client";

export interface CreateFoodLogInput {
  foodId: string;
  mealType: MealType;
  quantity: number;
  date?: string;
}

export type UpdateFoodLogInput = Partial<Pick<FoodLog, "mealType" | "quantity" | "date">>;

export const nutritionApi = {
  today: () => unwrap(api.get<ApiSuccess<DailyNutrition>>("/nutrition/today")),

  daily: (date: string) =>
    unwrap(api.get<ApiSuccess<DailyNutrition>>("/nutrition/daily", { params: { date } })),
};

// Không gửi calories/protein: server tự tính snapshot từ Food + quantity
export const foodLogApi = {
  list: (date?: string) =>
    unwrap(
      api.get<ApiSuccess<{ date: string; items: FoodLog[] }>>("/food-logs", {
        params: date ? { date } : undefined,
      })
    ),

  create: (input: CreateFoodLogInput) =>
    unwrap(api.post<ApiSuccess<FoodLog>>("/food-logs", input)),

  update: (id: string, input: UpdateFoodLogInput) =>
    unwrap(api.put<ApiSuccess<FoodLog>>(`/food-logs/${id}`, input)),

  remove: async (id: string) => {
    await api.delete(`/food-logs/${id}`);
  },
};
