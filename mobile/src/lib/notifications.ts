import { translate as t } from '@/i18n';
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
  // Expo Go does not support remote push; local reminders remain independent.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
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
  if (!settings.mealReminders.enabled) return;
  if (!(await ensurePermission())) throw new Error(t('Chưa cấp quyền thông báo.'));

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
        content: { title: r.title, body: r.body, sound: 'default', data: { url: "/nutrition" } },
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
  if (!settings.workoutReminder.enabled || !schedule) return;
  if (!(await ensurePermission())) throw new Error(t('Chưa cấp quyền thông báo.'));
  const reminders = buildWorkoutReminders({ now: new Date(), time: settings.workoutReminder.time, schedule });
  await Promise.all(reminders.map((r) => Notifications.scheduleNotificationAsync({
    identifier: `${REMINDER_PREFIX}${r.id}`,
    content: { title: r.title, body: r.body, sound: 'default', data: { url: "/workout" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: "default" },
  })));
}

export async function scheduleReminders(
  settings: NotificationSettings, today: TodayNutrition | null, schedule: WorkoutReminderSchedule | null = null
) {
  if (Platform.OS === "web") return;
  const results = await Promise.allSettled([scheduleWorkoutReminders(settings, schedule), scheduleNutritionReminders(settings, today)]);
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed) throw failed.reason;
}

let personalPlanQueue: Promise<void> = Promise.resolve();
let personalPlanGeneration = 0;
export function schedulePersonalPlanReminders(data: import("@/types/personalPlan").PersonalPlanResponse | null, enabled: boolean) {
  const ticket = ++personalPlanGeneration;
  personalPlanQueue = personalPlanQueue.catch(() => {}).then(async () => {
    if (Platform.OS === "web" || ticket !== personalPlanGeneration) return;
    await cancelByPrefix(`${REMINDER_PREFIX}plan-`);
    if (!enabled || !data || ticket !== personalPlanGeneration || !(await ensurePermission())) return;
    const { buildPersonalPlanReminders } = await import("./personalPlanReminders");
    const configuredData = { ...data,
      upcoming: data.upcoming?.map(plan => ({ ...plan, surveySnapshot: { ...plan.surveySnapshot, remindersEnabled: true } })),
      current: data.current ? { ...data.current, surveySnapshot: { ...data.current.surveySnapshot, remindersEnabled: true } } : null,
      pending: data.pending ? { ...data.pending, surveySnapshot: { ...data.pending.surveySnapshot, remindersEnabled: true } } : null,
    };
    for (const reminder of buildPersonalPlanReminders(configuredData)) {
      if (ticket !== personalPlanGeneration) return;
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${reminder.id}`,
        content: { title: reminder.title, body: reminder.body, sound: 'default', data: { url: "/plan" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: "default" },
      });
    }
  });
  return personalPlanQueue.catch(() => {});
}
