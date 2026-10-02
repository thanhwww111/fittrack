import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { scheduleWorkoutReminders } from "@/lib/notifications";
import type { NotificationSettings } from "@/types/models";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(), SchedulableTriggerInputTypes: { DATE: "date" },
}));
const settings = { workoutReminder: { enabled: true, time: "07:00", days: [] } } as unknown as NotificationSettings;
const schedule = { today: "2026-10-01", timezone: "Asia/Ho_Chi_Minh", days: [
  { date: "2026-10-01", status: "PLANNED", workout: { templateName: "Lower", exerciseCount: 5 } },
] };
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-09-30T22:00:00Z"));
  Platform.OS = "ios";
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([
    { identifier: "fittrack-reminder-workout-1" }, { identifier: "fittrack-reminder-meal-1" },
  ] as never);
});
afterEach(() => { Platform.OS = originalOS; jest.useRealTimers(); });

it("replaces old workout reminders with dates from schedule, leaving meal reminders untouched", async () => {
  await scheduleWorkoutReminders(settings, schedule);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("fittrack-reminder-workout-1");
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    content: expect.objectContaining({ body: expect.stringContaining("Lower"), data: { url: "/workout" } }),
    trigger: expect.objectContaining({ type: "date", date: new Date("2026-10-01T00:00:00Z") }),
  }));
});
it("cancels without scheduling when disabled or permission is denied", async () => {
  await scheduleWorkoutReminders({ ...settings, workoutReminder: { ...settings.workoutReminder, enabled: false } }, schedule);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never);
  await scheduleWorkoutReminders(settings, schedule);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
it("does not call native APIs on web", async () => {
  Platform.OS = "web";
  await scheduleWorkoutReminders(settings, schedule);
  expect(Notifications.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});
