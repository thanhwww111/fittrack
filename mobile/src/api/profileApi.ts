import type { ApiSuccess } from "@/types/api";
import type {
  GoalsOverview,
  Macros,
  NutritionTarget,
  TargetRecalculation,
  UpdateProfileInput,
  UserProfile,
} from "@/types/models";
import { api, unwrap } from "./client";

export const profileApi = {
  get: () => unwrap(api.get<ApiSuccess<UserProfile>>("/profile")),

  update: (input: UpdateProfileInput) =>
    unwrap(api.put<ApiSuccess<UserProfile>>("/profile", input)),
};

export const goalApi = {
  list: () => unwrap(api.get<ApiSuccess<GoalsOverview>>("/goals")),

  suggestion: () => unwrap(api.get<ApiSuccess<Macros>>("/goals/suggestion")),

  recalculation: () =>
    unwrap(api.get<ApiSuccess<TargetRecalculation>>("/goals/recalculation")),

  createAuto: () => unwrap(api.post<ApiSuccess<NutritionTarget>>("/goals", { mode: "AUTO" })),

  createManual: (macros: Macros) =>
    unwrap(api.post<ApiSuccess<NutritionTarget>>("/goals", { mode: "MANUAL", ...macros })),

  // Gửi macro = tự nhập (MANUAL); { mode: "AUTO" } = server tính lại từ profile
  update: (id: string, input: Macros | { mode: "AUTO" }) =>
    unwrap(api.put<ApiSuccess<NutritionTarget>>(`/goals/${id}`, input)),
};
