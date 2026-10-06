import { UserProfileModel } from "../models/userProfile.model";
import type { WeeklyCheckInInput } from "../schemas/profile.schema";
import { startOfWeek, todayInTimezone } from "../utils/date";
import { getProfileDocument } from "./profile.service";
import { upsertMeasurement } from "./bodyMeasurement.service";

function statusFor(profile: { timezone: string; measurementsConfirmedAt?: Date | null }, now = new Date()) {
  const today = todayInTimezone(profile.timezone, now);
  const weekStart = startOfWeek(today);
  const confirmedDate = profile.measurementsConfirmedAt ? todayInTimezone(profile.timezone, profile.measurementsConfirmedAt) : null;
  return { today, weekStart, required: !confirmedDate || confirmedDate < weekStart,
    confirmedAt: profile.measurementsConfirmedAt?.toISOString() ?? null };
}
export async function getWeeklyCheckIn(userId: string) {
  return statusFor(await getProfileDocument(userId));
}
export async function saveWeeklyCheckIn(userId: string, input: WeeklyCheckInInput) {
  const profile = await getProfileDocument(userId);
  const now = new Date();
  const today = todayInTimezone(profile.timezone, now);
  // Idempotent daily upsert; preserve circumference measurements already logged today.
  // Completion is recorded last so a failed history write cannot unlock the gate.
  const { measurement } = await upsertMeasurement(userId, { date: today, weight: input.weight, height: input.height }, true);
  // Recording real weight can cross the goal; it must not invoke goal-setting validation.
  const updated = await UserProfileModel.findOneAndUpdate({ _id: profile._id, userId }, {
    $set: { height: input.height, measurementsConfirmedAt: now },
  }, { returnDocument: "after", runValidators: true });
  return { status: statusFor(updated!), profile: updated!.toJSON(), measurement };
}
