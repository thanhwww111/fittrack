import { Schema, model, type InferSchemaType } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm

// Nhắc nạp dinh dưỡng: user tự thêm / sửa / xoá, mặc định 3 bữa chính
const mealReminderSchema = new Schema(
  {
    time: { type: String, required: true, match: TIME_REGEX },
    label: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false }
);

const DEFAULT_MEAL_REMINDERS = [
  { time: "07:00", label: "Bữa sáng" },
  { time: "12:00", label: "Bữa trưa" },
  { time: "19:00", label: "Bữa tối" },
];

// Nhắc tập và nhắc ghi bữa ăn do app tự đặt lịch trên máy (local notification).
// Server lưu cài đặt để đồng bộ giữa các máy và để biết có gửi push sự kiện hay không.
const notificationSettingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    workoutReminder: {
      enabled: { type: Boolean, default: false },
      // 0 = Chủ nhật ... 6 = thứ Bảy
      days: { type: [Number], default: [1, 3, 5] },
      time: { type: String, default: "18:00", match: TIME_REGEX },
    },
    mealReminders: {
      enabled: { type: Boolean, default: false },
      // Sắp theo giờ. Bản ghi kiểu cũ (breakfast/lunch/dinner) không có items → nhận mặc định
      items: { type: [mealReminderSchema], default: () => DEFAULT_MEAL_REMINDERS },
    },
    weeklyReport: { type: Boolean, default: true },
    prAlerts: { type: Boolean, default: true },
    goalAlerts: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyToJSON(notificationSettingsSchema, ["userId", "createdAt"]);

export type NotificationSettings = InferSchemaType<typeof notificationSettingsSchema>;

export const NotificationSettingsModel = model("NotificationSettings", notificationSettingsSchema);
