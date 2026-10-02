import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Macros, NotificationSettings } from "@/types/models";
import { buildNutritionReminders } from "./nutritionReminders";
import { buildWorkoutReminders, type WorkoutReminderSchedule } from "./workoutReminders";

// Mọi lịch nhắc app tự đặt đều có id bắt đầu bằng tiền tố này,
// để huỷ đúng phần của mình mà không đụng thông báo khác
const REMINDER_PREFIX = "fittrack-reminder-";

let configured = false;

// Gọi một lần lúc app khởi động
export function configureNotifications() {
  if (configured || Platform.OS === "web") return;
  configured = true;

  // Hiện thông báo cả khi app đang mở
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    // Trùng channelId "default" mà server gửi kèm push
    Notifications.setNotificationChannelAsync("default", {
      name: "FitTrack",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensurePermission() {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export type PushTokenResult =
  | { token: string }
  | { token: null; reason: "web" | "simulator" | "expo-go" | "no-project" | "denied" | "error" };

// Lấy Expo push token để server gửi push (PR mới, đạt mục tiêu, báo cáo tuần)
export async function getPushToken(): Promise<PushTokenResult> {
  if (Platform.OS === "web") return { token: null, reason: "web" };
  if (!Device.isDevice) return { token: null, reason: "simulator" };
  // Từ SDK 53, Expo Go trên Android không nhận remote push: cần development build / bản EAS
  if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return { token: null, reason: "expo-go" };
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { token: null, reason: "no-project" };
  if (!(await ensurePermission())) return { token: null, reason: "denied" };

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data };
  } catch (err) {
    console.warn("Failed to get Expo push token:", err);
    return { token: null, reason: "error" };
  }
}

async function cancelByPrefix(prefix: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function cancelReminders() {
  if (Platform.OS === "web") return;
  await cancelByPrefix(REMINDER_PREFIX);
}

const MEAL_PREFIX = `${REMINDER_PREFIX}meal-`;
// Đặt trước hôm nay + 2 ngày: không mở app vẫn có nhắc (iOS giới hạn 64 lịch; tối đa 8 lần nhắc × 3 ngày)
const NUTRITION_DAYS = 3;

export interface TodayNutrition {
  target: Macros | null;
  consumed: Macros;
}

// Nhắc nạp dinh dưỡng (sáng / trưa / tối) kèm số calo, protein còn thiếu. Nội dung cố định lúc đặt lịch
// nên phải gọi lại mỗi khi số liệu hôm nay đổi (ghi / sửa / xoá món, mở lại app).
export async function scheduleNutritionReminders(
  settings: NotificationSettings,
  today: TodayNutrition | null
) {
  if (Platform.OS === "web") return;
  await cancelByPrefix(MEAL_PREFIX);
  if (!settings.mealReminders.enabled || !(await ensurePermission())) return;

  const reminders = buildNutritionReminders({
    now: new Date(),
    target: today?.target ?? null,
    consumed: today?.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
    items: settings.mealReminders.items,
    days: NUTRITION_DAYS,
  });
  await Promise.all(
    reminders.map((r) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${r.id}`,
        content: { title: r.title, body: r.body, data: { url: "/nutrition" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: "default" },
      })
    )
  );
}

// Đặt lại toàn bộ lịch nhắc cục bộ theo cài đặt. Chạy được cả trong Expo Go
// vì không cần server: máy tự hiện thông báo đúng giờ.
export async function scheduleWorkoutReminders(settings: NotificationSettings, schedule: WorkoutReminderSchedule | null) {
  if (Platform.OS === "web") return;
  await cancelByPrefix(`${REMINDER_PREFIX}workout-`);
  if (!settings.workoutReminder.enabled || !schedule || !(await ensurePermission())) return;
  const reminders = buildWorkoutReminders({ now: new Date(), time: settings.workoutReminder.time, schedule });
  await Promise.all(reminders.map((r) => Notifications.scheduleNotificationAsync({
    identifier: `${REMINDER_PREFIX}${r.id}`,
    content: { title: r.title, body: r.body, data: { url: "/workout" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: "default" },
  })));
}

export async function scheduleReminders(
  settings: NotificationSettings, today: TodayNutrition | null, schedule: WorkoutReminderSchedule | null = null
) {
  if (Platform.OS === "web") return;
  await scheduleWorkoutReminders(settings, schedule);
  await scheduleNutritionReminders(settings, today);
}
