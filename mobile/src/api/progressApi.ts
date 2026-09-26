import type { ApiSuccess } from "@/types/api";
import type {
  BodyMeasurement,
  GoalProgress,
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

  goal: () => unwrap(api.get<ApiSuccess<GoalProgress>>("/progress/goal")),

  weight: (range: DateRange = {}) =>
    unwrap(api.get<ApiSuccess<WeightProgress>>("/progress/weight", { params: range })),

  workout: (weeks: number) =>
    unwrap(
      api.get<ApiSuccess<{ weeks: WorkoutWeek[] }>>("/progress/workout", { params: { weeks } })
    ),

  nutrition: (range: DateRange = {}) =>
    unwrap(api.get<ApiSuccess<NutritionProgress>>("/progress/nutrition", { params: range })),
};

export type MeasurementInput = Partial<Omit<BodyMeasurement, "id" | "weight" | "date">> & {
  weight: number;
  date?: string;
};

export const measurementApi = {
  // Sắp xếp theo ngày tăng dần
  list: (range: DateRange = {}) =>
    unwrap(api.get<ApiSuccess<BodyMeasurement[]>>("/body-measurements", { params: range })),

  // Mỗi ngày một bản ghi: gửi lại cùng ngày thì server ghi đè,
  // field không gửi (bodyFat, vòng eo...) bị reset về null
  save: (input: MeasurementInput) =>
    unwrap(api.post<ApiSuccess<BodyMeasurement>>("/body-measurements", input)),

  remove: async (id: string) => {
    await api.delete(`/body-measurements/${id}`);
  },
};
