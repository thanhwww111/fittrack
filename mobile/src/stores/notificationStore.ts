import { Platform } from "react-native";
import { create } from "zustand";
import { notificationApi } from "@/api/notificationApi";
import { errorMessage } from "@/lib/formErrors";
import { cancelReminders, getPushToken, scheduleReminders, type PushTokenResult } from "@/lib/notifications";
import type { NotificationSettings, UpdateNotificationSettings } from "@/types/models";

interface NotificationState {
  settings: NotificationSettings | null;
  push: PushTokenResult | null;
  error: string | null;

  // Sau khi đăng nhập / mở app: tải cài đặt, đặt lịch nhắc, đăng ký nhận push
  syncOnLogin: () => Promise<void>;
  update: (input: UpdateNotificationSettings) => Promise<void>;
  // Gọi TRƯỚC khi đăng xuất (còn access token) để server ngừng gửi push tới máy này
  unregisterDevice: () => Promise<void>;
  reset: () => void;
}

const initialState = { settings: null, push: null, error: null };

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  ...initialState,

  syncOnLogin: async () => {
    try {
      const settings = await notificationApi.getSettings();
      set({ settings, error: null });
      await scheduleReminders(settings);

      const push = await getPushToken();
      set({ push });
      if (push.token && Platform.OS !== "web") {
        await notificationApi.registerDevice(push.token, Platform.OS === "ios" ? "ios" : "android");
      }
    } catch (err) {
      // Thông báo là tính năng phụ: lỗi ở đây không được chặn việc dùng app
      set({ error: errorMessage(err) });
    }
  },

  update: async (input) => {
    const settings = await notificationApi.updateSettings(input);
    set({ settings });
    await scheduleReminders(settings);
  },

  unregisterDevice: async () => {
    const token = get().push?.token;
    if (!token) return;
    try {
      await notificationApi.unregisterDevice(token);
    } catch {
      // Mất mạng: token sẽ tự chuyển sang user khác khi họ đăng nhập trên máy này
    }
  },

  reset: () => {
    cancelReminders().catch(() => {});
    set(initialState);
  },
}));
