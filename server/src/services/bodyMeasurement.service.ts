import { BodyMeasurementModel } from "../models/bodyMeasurement.model";
import { UserProfileModel } from "../models/userProfile.model";
import type { DateRangeQuery, UpsertMeasurementInput } from "../schemas/progress.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { notifyGoalReached } from "./notification.service";
import { getUserTimezone } from "./profile.service";

async function latestWeight(userId: string) {
  const latest = await BodyMeasurementModel.findOne({ userId }).sort({ date: -1 }).lean();
  return latest?.weight ?? null;
}

// Profile.currentWeight luôn bằng cân nặng của lần đo mới nhất,
// để target AUTO và dashboard dùng đúng số hiện tại
async function syncCurrentWeight(userId: string) {
  const weight = await latestWeight(userId);
  if (weight !== null) {
    await UserProfileModel.updateOne({ userId }, { $set: { currentWeight: weight } });
  }
}

// Chỉ báo đúng một lần: lúc cân nặng mới nhất vừa vượt qua mốc goalWeight
export function crossedGoal(
  goalType: string | null | undefined,
  goalWeight: number | null | undefined,
  before: number | null,
  after: number | null
) {
  if (goalWeight == null || after === null) return false;
  if (goalType === "WEIGHT_LOSS") return after <= goalWeight && (before === null || before > goalWeight);
  if (goalType === "MUSCLE_GAIN") return after >= goalWeight && (before === null || before < goalWeight);
  return false;
}

export async function upsertMeasurement(userId: string, input: UpsertMeasurementInput) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const date = input.date ?? today;
  if (date > today) {
    throw AppError.badRequest("Cannot record a measurement for a future date");
  }

  const { date: _ignored, ...values } = input;
  const [existed, weightBefore] = await Promise.all([
    BodyMeasurementModel.exists({ userId, date }),
    latestWeight(userId),
  ]);

  // Field không gửi lên thì reset về null: một ngày là một lần đo hoàn chỉnh
  const measurement = await BodyMeasurementModel.findOneAndUpdate(
    { userId, date },
    {
      $set: {
        bodyFat: null,
        chest: null,
        waist: null,
        arm: null,
        thigh: null,
        ...values,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await syncCurrentWeight(userId);

  const [weightAfter, profile] = await Promise.all([
    latestWeight(userId),
    UserProfileModel.findOne({ userId }).select("goalType goalWeight").lean(),
  ]);
  if (crossedGoal(profile?.goalType, profile?.goalWeight, weightBefore, weightAfter)) {
    void notifyGoalReached(userId, weightAfter!, profile!.goalWeight!);
  }

  return { created: !existed, measurement: measurement!.toJSON() };
}

export async function listMeasurements(userId: string, query: DateRangeQuery) {
  const date: Record<string, string> = {};
  if (query.from) date.$gte = query.from;
  if (query.to) date.$lte = query.to;

  const items = await BodyMeasurementModel.find({
    userId,
    ...(Object.keys(date).length > 0 && { date }),
  }).sort({ date: 1 });
  return items.map((m) => m.toJSON());
}

export async function deleteMeasurement(userId: string, measurementId: string) {
  const measurement = await BodyMeasurementModel.findOneAndDelete({ _id: measurementId, userId });
  if (!measurement) {
    throw AppError.notFound("Measurement not found");
  }
  await syncCurrentWeight(userId);
}
