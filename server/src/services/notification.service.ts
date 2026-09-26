import { NotificationSettingsModel } from "../models/notificationSettings.model";
import { PushDeviceModel } from "../models/pushDevice.model";
import type { RegisterDeviceInput, UpdateSettingsInput } from "../schemas/notification.schema";
import { round1 } from "../utils/foodNutrition";
import { getWeeklySummary } from "./progress.service";
import { pushClient, type PushPayload } from "./push/pushClient";

type AlertKind = "prAlerts" | "goalAlerts" | "weeklyReport";

// ---------- Cài đặt ----------

async function getSettingsDocument(userId: string) {
  // Chưa có thì tạo với giá trị mặc định
  return NotificationSettingsModel.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

export async function getSettings(userId: string) {
  return (await getSettingsDocument(userId))!.toJSON();
}

export async function updateSettings(userId: string, input: UpdateSettingsInput) {
  const settings = (await getSettingsDocument(userId))!;

  // Gộp từng nhóm để client gửi một phần (ví dụ chỉ `workoutReminder.enabled`) không làm mất phần còn lại
  const { workoutReminder, mealReminders, ...flags } = input;
  if (workoutReminder) {
    const days = workoutReminder.days && [...new Set(workoutReminder.days)].sort();
    settings.set("workoutReminder", {
      ...settings.toObject().workoutReminder,
      ...workoutReminder,
      ...(days && { days }),
    });
  }
  if (mealReminders) {
    const items =
      mealReminders.items && [...mealReminders.items].sort((a, b) => a.time.localeCompare(b.time));
    settings.set("mealReminders", {
      ...settings.toObject().mealReminders,
      ...mealReminders,
      ...(items && { items }),
    });
  }
  settings.set(flags);

  await settings.save();
  return settings.toJSON();
}

// ---------- Thiết bị ----------

export async function registerDevice(userId: string, input: RegisterDeviceInput) {
  // Upsert theo token: cùng máy đăng nhập tài khoản khác thì token chuyển chủ
  await PushDeviceModel.updateOne(
    { token: input.token },
    { $set: { userId, platform: input.platform, lastSeenAt: new Date() } },
    { upsert: true }
  );
}

export async function unregisterDevice(userId: string, token: string) {
  await PushDeviceModel.deleteOne({ userId, token });
}

// ---------- Gửi ----------

// Gửi push cho user nếu user bật loại thông báo này. Không bao giờ throw:
// thông báo là phụ, lỗi gửi push không được làm hỏng request chính.
export async function notifyUser(userId: string, kind: AlertKind, payload: PushPayload) {
  try {
    const settings = await NotificationSettingsModel.findOne({ userId }).lean();
    // Chưa từng mở cài đặt = dùng mặc định (bật cả 3 loại)
    if (settings && settings[kind] === false) return { sent: 0 };

    const devices = await PushDeviceModel.find({ userId }).select("token").lean();
    if (devices.length === 0) return { sent: 0 };

    const result = await pushClient.send(
      devices.map((d) => d.token),
      payload
    );
    if (result.invalidTokens.length > 0) {
      await PushDeviceModel.deleteMany({ token: { $in: result.invalidTokens } });
    }
    return { sent: result.sent };
  } catch (err) {
    console.error(`Failed to send ${kind} push to user ${userId}:`, err);
    return { sent: 0 };
  }
}

const RECORD_LABELS: Record<string, string> = {
  maxWeight: "tạ nặng nhất",
  maxReps: "nhiều rep nhất",
  estimatedOneRepMax: "1RM ước tính",
};

export function notifyNewRecords(
  userId: string,
  sessionId: string,
  records: { exerciseName: string; improved: string[] }[]
) {
  if (records.length === 0) return Promise.resolve({ sent: 0 });

  const [first, ...rest] = records;
  const body =
    rest.length === 0
      ? `${first.exerciseName}: ${first.improved.map((f) => RECORD_LABELS[f] ?? f).join(", ")}`
      : `${records.map((r) => r.exerciseName).join(", ")}`;

  return notifyUser(userId, "prAlerts", {
    title: records.length === 1 ? "🏆 Kỷ lục mới!" : `🏆 ${records.length} kỷ lục mới!`,
    body,
    data: { url: `/workout/session?id=${sessionId}` },
  });
}

export function notifyGoalReached(userId: string, weight: number, goalWeight: number) {
  return notifyUser(userId, "goalAlerts", {
    title: "🎯 Bạn đã đạt cân nặng mục tiêu!",
    body: `Cân nặng hiện tại ${weight} kg (mục tiêu ${goalWeight} kg). Vào Hồ sơ để đặt mục tiêu mới nhé.`,
    data: { url: "/profile" },
  });
}

// Chạy mỗi sáng thứ Hai (cron gọi /api/internal/weekly-report): tổng kết tuần trước
export async function sendWeeklyReports() {
  const userIds = await PushDeviceModel.distinct("userId");
  let sent = 0;
  let skipped = 0;

  for (const id of userIds) {
    const userId = String(id);
    const summary = await getWeeklySummary(userId, { previousWeek: true });
    const { workout, nutrition, weight, adherence } = summary;

    // Tuần không có hoạt động nào thì không làm phiền
    if (workout.sessions === 0 && nutrition.loggedDays === 0) {
      skipped += 1;
      continue;
    }

    const sessions = adherence.workout.target
      ? `${workout.sessions}/${adherence.workout.target}`
      : String(workout.sessions);
    let workoutPart = `${sessions} buổi tập, ${Math.round(workout.totalVolume)} kg volume`;
    if (workout.volumeChange !== null) {
      const sign = workout.volumeChange > 0 ? "+" : "";
      workoutPart += ` (${sign}${workout.volumeChange}% so tuần trước)`;
    }
    const parts = [workoutPart];
    // Ngày không log cũng tính là chưa đủ protein
    if (adherence.protein.days > 0) {
      parts.push(`đủ protein ${adherence.protein.met}/${adherence.protein.days} ngày`);
    }
    if (weight.change !== null) {
      parts.push(`cân nặng ${weight.change > 0 ? "+" : ""}${round1(weight.change)} kg`);
    }
    if (summary.newPersonalRecords > 0) parts.push(`${summary.newPersonalRecords} PR mới`);

    const result = await notifyUser(userId, "weeklyReport", {
      title: "📊 Tổng kết tuần của bạn",
      body: parts.join(" · "),
      data: { url: "/progress" },
    });
    sent += result.sent;
  }

  return { users: userIds.length, skipped, sent };
}
