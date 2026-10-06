import { api, unwrap } from "./client";
import type { ApiSuccess } from "@/types/api";
import type { BodyMeasurement, UserProfile } from "@/types/models";

export interface WeeklyCheckInStatus {
  today: string;
  weekStart: string;
  required: boolean;
  confirmedAt: string | null;
}
export const weeklyCheckInApi = {
  status: () => unwrap(api.get<ApiSuccess<WeeklyCheckInStatus>>("/profile/weekly-check-in")),
  save: (input: { weight: number; height: number }) => unwrap(api.post<ApiSuccess<{
    status: WeeklyCheckInStatus; profile: UserProfile; measurement: BodyMeasurement;
  }>>("/profile/weekly-check-in", input)),
};
