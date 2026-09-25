import type { ApiSuccess } from "@/types/api";
import type { DailyNutrition } from "@/types/models";
import { api, unwrap } from "./client";

export const nutritionApi = {
  today: () => unwrap(api.get<ApiSuccess<DailyNutrition>>("/nutrition/today")),
};
