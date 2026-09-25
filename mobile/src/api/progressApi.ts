import type { ApiSuccess } from "@/types/api";
import type { WeeklySummary } from "@/types/models";
import { api, unwrap } from "./client";

export const progressApi = {
  weekly: () => unwrap(api.get<ApiSuccess<WeeklySummary>>("/progress/weekly")),
};
