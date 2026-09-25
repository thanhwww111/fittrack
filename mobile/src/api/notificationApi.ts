import type { ApiSuccess } from "@/types/api";
import type { NotificationSettings, UpdateNotificationSettings } from "@/types/models";
import { api, unwrap } from "./client";

export const notificationApi = {
  getSettings: () => unwrap(api.get<ApiSuccess<NotificationSettings>>("/notifications/settings")),

  updateSettings: (input: UpdateNotificationSettings) =>
    unwrap(api.put<ApiSuccess<NotificationSettings>>("/notifications/settings", input)),

  registerDevice: async (token: string, platform: "ios" | "android") => {
    await api.post("/notifications/devices", { token, platform });
  },

  unregisterDevice: async (token: string) => {
    await api.delete("/notifications/devices", { data: { token } });
  },
};
