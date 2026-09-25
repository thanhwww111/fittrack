import { BodyMeasurementModel } from "../models/bodyMeasurement.model";
import { UserProfileModel } from "../models/userProfile.model";
import type { DateRangeQuery, UpsertMeasurementInput } from "../schemas/progress.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { getUserTimezone } from "./profile.service";

// Profile.currentWeight luôn bằng cân nặng của lần đo mới nhất,
// để target AUTO và dashboard dùng đúng số hiện tại
async function syncCurrentWeight(userId: string) {
  const latest = await BodyMeasurementModel.findOne({ userId }).sort({ date: -1 }).lean();
  if (latest) {
    await UserProfileModel.updateOne({ userId }, { $set: { currentWeight: latest.weight } });
  }
}

export async function upsertMeasurement(userId: string, input: UpsertMeasurementInput) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const date = input.date ?? today;
  if (date > today) {
    throw AppError.badRequest("Cannot record a measurement for a future date");
  }

  const { date: _ignored, ...values } = input;
  const existed = await BodyMeasurementModel.exists({ userId, date });

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
