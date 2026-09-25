import type { ApiSuccess } from "@/types/api";
import type {
  BodyMeasurement,
  NutritionProgress,
  WeeklySummary,
  WeightProgress,
  WorkoutWeek,
} from "@/types/models";
import { api, unwrap } from "./client";

interface DateRange {
  from?: string;
  to?: string;
}

export const progressApi = {
  weekly: () => unwrap(api.get<ApiSuccess<WeeklySummary>>("/progress/weekly")),

  weight: (range: DateRange = {}) =>
    unwrap(api.get<ApiSuccess<WeightProgress>>("/progress/weight", { params: range })),

  workout: (weeks: number) =>
    unwrap(
      api.get<ApiSuccess<{ weeks: WorkoutWeek[] }>>("/progress/workout", { params: { weeks } })
    ),

  nutrition: (range: DateRange = {}) =>
    unwrap(api.get<ApiSuccess<NutritionProgress>>("/progress/nutrition", { params: range })),
};

export const measurementApi = {
  // Mỗi ngày một bản ghi: gửi lại cùng ngày thì server ghi đè
  save: (input: { weight: number; date?: string }) =>
    unwrap(api.post<ApiSuccess<BodyMeasurement>>("/body-measurements", input)),
};
