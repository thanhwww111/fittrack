import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationSettings } from "@/types/models";

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

function parseTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

export async function cancelReminders() {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

const MEALS = [
  { key: "breakfast", label: "bữa sáng", url: "/nutrition" },
  { key: "lunch", label: "bữa trưa", url: "/nutrition" },
  { key: "dinner", label: "bữa tối", url: "/nutrition" },
] as const;

// Đặt lại toàn bộ lịch nhắc cục bộ theo cài đặt. Chạy được cả trong Expo Go
// vì không cần server: máy tự hiện thông báo đúng giờ.
export async function scheduleReminders(settings: NotificationSettings) {
  if (Platform.OS === "web") return;
  await cancelReminders();

  const wantsAny = settings.workoutReminder.enabled || settings.mealReminders.enabled;
  if (!wantsAny || !(await ensurePermission())) return;

  const jobs: Promise<string>[] = [];

  if (settings.workoutReminder.enabled) {
    const { hour, minute } = parseTime(settings.workoutReminder.time);
    for (const day of settings.workoutReminder.days) {
      jobs.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${REMINDER_PREFIX}workout-${day}`,
          content: {
            title: "💪 Đến giờ tập rồi!",
            body: "Mở FitTrack để bắt đầu buổi tập hôm nay.",
            data: { url: "/workout" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            // Server lưu 0 = CN ... 6 = T7, Expo dùng 1 = CN ... 7 = T7
            weekday: day + 1,
            hour,
            minute,
            channelId: "default",
          },
        })
      );
    }
  }

  if (settings.mealReminders.enabled) {
    for (const meal of MEALS) {
      const { hour, minute } = parseTime(settings.mealReminders[meal.key]);
      jobs.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${REMINDER_PREFIX}meal-${meal.key}`,
          content: {
            title: "🍽️ Đừng quên ghi bữa ăn",
            body: `Ghi lại ${meal.label} để theo dõi calo và protein.`,
            data: { url: meal.url },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: "default",
          },
        })
      );
    }
  }

  await Promise.all(jobs);
}
