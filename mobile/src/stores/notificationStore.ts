import { Platform } from "react-native";
import { create } from "zustand";
import { notificationApi } from "@/api/notificationApi";
import { errorMessage } from "@/lib/formErrors";
import { nutritionApi } from "@/api/nutritionApi";
import {
  cancelReminders,
  getPushToken,
  scheduleNutritionReminders,
  scheduleReminders,
  type PushTokenResult,
  type TodayNutrition,
} from "@/lib/notifications";
import type { DailyNutrition, NotificationSettings, UpdateNotificationSettings } from "@/types/models";

interface NotificationState {
  settings: NotificationSettings | null;
  push: PushTokenResult | null;
  error: string | null;

  // Sau khi đăng nhập / mở app: tải cài đặt, đặt lịch nhắc, đăng ký nhận push
  syncOnLogin: () => Promise<void>;
  update: (input: UpdateNotificationSettings) => Promise<void>;
  // Đặt lại nhắc nạp dinh dưỡng với số calo/protein còn thiếu mới nhất.
  // Truyền summary của hôm nay nếu đã có sẵn để khỏi gọi API lần nữa.
  refreshNutritionReminders: (today?: DailyNutrition) => Promise<void>;
  // Gọi TRƯỚC khi đăng xuất (còn access token) để server ngừng gửi push tới máy này
  unregisterDevice: () => Promise<void>;
  reset: () => void;
}

const initialState = { settings: null, push: null, error: null };

// Lỗi mạng thì vẫn đặt nhắc dạng chung (không có số liệu)
async function loadToday(): Promise<TodayNutrition | null> {
  try {
    const today = await nutritionApi.today();
    return { target: today.target, consumed: today.consumed };
  } catch {
    return null;
  }
}

// Xếp hàng các lần đặt lịch: huỷ rồi đặt lại của 2 lần gọi sát nhau không được chen vào nhau
let queue: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch(() => {});
  return queue;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  ...initialState,

  syncOnLogin: async () => {
    try {
      const settings = await notificationApi.getSettings();
      set({ settings, error: null });
      const today = await loadToday();
      await enqueue(() => scheduleReminders(settings, today));

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
    const today = await loadToday();
    await enqueue(() => scheduleReminders(settings, today));
  },

  refreshNutritionReminders: async (summary) => {
    const { settings } = get();
    if (!settings?.mealReminders.enabled) return;
    const today = summary ? { target: summary.target, consumed: summary.consumed } : await loadToday();
    await enqueue(() => scheduleNutritionReminders(settings, today));
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
