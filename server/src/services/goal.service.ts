import { NutritionTargetModel } from "../models/nutritionTarget.model";
import type { CreateGoalInput, UpdateGoalInput } from "../schemas/goal.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { calculateNutritionTarget, type TargetInput } from "../utils/nutritionCalculator";
import { getProfileDocument, getUserTimezone } from "./profile.service";

const REQUIRED_PROFILE_FIELDS = [
  "gender",
  "age",
  "height",
  "currentWeight",
  "activityLevel",
  "goalType",
] as const;

export async function getSuggestedTarget(userId: string) {
  const profile = await getProfileDocument(userId);

  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => profile[field] == null);
  if (missing.length > 0) {
    throw AppError.badRequest("Profile is incomplete for automatic target calculation", {
      missingFields: missing,
    });
  }

  return calculateNutritionTarget(profile.toObject() as unknown as TargetInput);
}

// Target đang áp dụng cho ngày `date` (mặc định hôm nay của user)
export async function getActiveTarget(userId: string, date?: string) {
  const day = date ?? todayInTimezone(await getUserTimezone(userId));
  return NutritionTargetModel.findOne({ userId, effectiveFrom: { $lte: day } }).sort({
    effectiveFrom: -1,
  });
}

export async function listGoals(userId: string) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const targets = await NutritionTargetModel.find({ userId }).sort({ effectiveFrom: -1 });

  const current = targets.find((t) => t.effectiveFrom <= today) ?? null;
  return {
    today,
    current: current?.toJSON() ?? null,
    history: targets.map((t) => t.toJSON()),
  };
}

export async function createGoal(userId: string, input: CreateGoalInput) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const effectiveFrom = input.effectiveFrom ?? today;

  // Tạo target lùi ngày sẽ làm sai lịch sử của các ngày đã qua
  if (effectiveFrom < today) {
    throw AppError.badRequest("effectiveFrom cannot be in the past");
  }

  const exists = await NutritionTargetModel.exists({ userId, effectiveFrom });
  if (exists) {
    throw AppError.conflict(
      `A target already exists for ${effectiveFrom}, update it with PUT /api/goals/:id`
    );
  }

  const macros =
    input.mode === "AUTO"
      ? await getSuggestedTarget(userId)
      : { calories: input.calories, protein: input.protein, carbs: input.carbs, fat: input.fat };

  const target = await NutritionTargetModel.create({
    userId,
    effectiveFrom,
    source: input.mode,
    ...macros,
  });
  return target.toJSON();
}

export async function updateGoal(userId: string, goalId: string, input: UpdateGoalInput) {
  // Lọc theo userId để user không sửa được target của người khác
  const target = await NutritionTargetModel.findOne({ _id: goalId, userId });
  if (!target) {
    throw AppError.notFound("Goal not found");
  }

  const today = todayInTimezone(await getUserTimezone(userId));
  if (target.effectiveFrom < today) {
    throw AppError.conflict("Past targets are immutable, create a new target instead");
  }

  target.set({ ...input, source: "MANUAL" });
  await target.save();
  return target.toJSON();
}
