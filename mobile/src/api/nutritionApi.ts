import type { ApiSuccess } from "@/types/api";
import type { DailyNutrition, FoodLog, MealTemplate, MealType, WaterDay } from "@/types/models";
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

export const mealCopyApi = {
  // Chép các món của một bữa sang bữa khác (mặc định: cùng bữa, hôm nay)
  copy: (input: { fromDate: string; fromMealType: MealType; toDate?: string; toMealType?: MealType }) =>
    unwrap(
      api.post<ApiSuccess<{ date: string; mealType: MealType; items: FoodLog[] }>>(
        "/food-logs/copy",
        input
      )
    ),
};

export const mealTemplateApi = {
  list: () => unwrap(api.get<ApiSuccess<MealTemplate[]>>("/meal-templates")),

  create: (input: { name: string; items: { foodId: string; quantity: number }[] }) =>
    unwrap(api.post<ApiSuccess<MealTemplate>>("/meal-templates", input)),

  // Lưu các món đã ghi của một bữa thành bữa mẫu
  fromMeal: (input: { name: string; date: string; mealType: MealType }) =>
    unwrap(api.post<ApiSuccess<MealTemplate>>("/meal-templates/from-meal", input)),

  update: (id: string, input: { name?: string; items?: { foodId: string; quantity: number }[] }) =>
    unwrap(api.put<ApiSuccess<MealTemplate>>(`/meal-templates/${id}`, input)),

  remove: async (id: string) => {
    await api.delete(`/meal-templates/${id}`);
  },

  apply: (id: string, input: { mealType: MealType; date?: string }) =>
    unwrap(
      api.post<ApiSuccess<{ date: string; mealType: MealType; items: FoodLog[]; skipped: number }>>(
        `/meal-templates/${id}/apply`,
        input
      )
    ),
};

export const waterApi = {
  get: (date?: string) =>
    unwrap(api.get<ApiSuccess<WaterDay>>("/water", { params: date ? { date } : undefined })),

  // amount âm = bớt đi khi bấm nhầm
  add: (amount: number, date?: string) =>
    unwrap(api.post<ApiSuccess<WaterDay>>("/water/add", { amount, date })),

  set: (amount: number, date?: string) =>
    unwrap(api.put<ApiSuccess<WaterDay>>("/water", { amount, date })),
};
