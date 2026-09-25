import type { ApiSuccess } from "@/types/api";
import type {
  GoalsOverview,
  Macros,
  NutritionTarget,
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

  createAuto: () => unwrap(api.post<ApiSuccess<NutritionTarget>>("/goals", { mode: "AUTO" })),

  update: (id: string, macros: Macros) =>
    unwrap(api.put<ApiSuccess<NutritionTarget>>(`/goals/${id}`, macros)),
};
