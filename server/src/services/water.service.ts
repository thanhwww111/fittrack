import { UserProfileModel } from "../models/userProfile.model";
import { WaterLogModel } from "../models/waterLog.model";
import type { AddWaterInput, SetWaterInput } from "../schemas/water.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { getUserTimezone } from "./profile.service";

const DEFAULT_TARGET = 2000; // ml
const MAX_AMOUNT = 20000;

// Khuyến nghị phổ biến ~35 ml / kg cân nặng, làm tròn 50 ml, trong khoảng 1.5–4 lít
export function waterTarget(weight: number | null | undefined) {
  if (!weight) return DEFAULT_TARGET;
  return Math.min(4000, Math.max(1500, Math.round((weight * 35) / 50) * 50));
}

async function resolveDate(userId: string, date?: string) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const day = date ?? today;
  if (day > today) {
    throw AppError.badRequest("Cannot log water for a future date");
  }
  return day;
}

async function summary(userId: string, date: string, amount: number) {
  const profile = await UserProfileModel.findOne({ userId }).select("currentWeight").lean();
  return { date, amount, target: waterTarget(profile?.currentWeight) };
}

export async function getWater(userId: string, date?: string) {
  const day = date ?? todayInTimezone(await getUserTimezone(userId));
  const log = await WaterLogModel.findOne({ userId, date: day }).lean();
  return summary(userId, day, log?.amount ?? 0);
}

export async function addWater(userId: string, input: AddWaterInput) {
  const date = await resolveDate(userId, input.date);
  let log: { amount: number } | null = await WaterLogModel.findOneAndUpdate(
    { userId, date },
    { $inc: { amount: input.amount } },
    { upsert: true, returnDocument: "after" }
  ).lean();
  // Bớt quá tay (hoặc cộng quá mức) thì kẹp lại trong [0, MAX]
  const clamped = Math.min(MAX_AMOUNT, Math.max(0, log!.amount));
  if (clamped !== log!.amount) {
    log = await WaterLogModel.findOneAndUpdate(
      { userId, date },
      { $set: { amount: clamped } },
      { returnDocument: "after" }
    ).lean();
  }
  return summary(userId, date, log!.amount);
}

export async function setWater(userId: string, input: SetWaterInput) {
  const date = await resolveDate(userId, input.date);
  const log = await WaterLogModel.findOneAndUpdate(
    { userId, date },
    { $set: { amount: input.amount } },
    { upsert: true, returnDocument: "after", runValidators: true }
  ).lean();
  return summary(userId, date, log!.amount);
}
