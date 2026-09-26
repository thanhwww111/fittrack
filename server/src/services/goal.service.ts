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

const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;

// Sau khi đổi cân nặng / mức vận động / mục tiêu: target AUTO đang áp dụng có còn khớp profile không.
// Target MANUAL là số user tự nhập nên không bao giờ gợi ý ghi đè.
export async function getRecalculation(userId: string) {
  const current = await getActiveTarget(userId);
  if (!current || current.source !== "AUTO") {
    return { needed: false, current: current?.toJSON() ?? null, suggested: null };
  }

  let suggested;
  try {
    suggested = await getSuggestedTarget(userId);
  } catch (err) {
    // Profile thiếu trường thì chưa tính lại được, không phải lỗi của request này
    if (err instanceof AppError && err.statusCode === 400) {
      return { needed: false, current: current.toJSON(), suggested: null };
    }
    throw err;
  }

  const needed = MACRO_KEYS.some((key) => current[key] !== suggested[key]);
  return { needed, current: current.toJSON(), suggested };
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

  if (input.mode === "AUTO") {
    target.set({ ...(await getSuggestedTarget(userId)), source: "AUTO" });
  } else {
    const { calories, protein, carbs, fat } = input;
    target.set({ calories, protein, carbs, fat, source: "MANUAL" });
  }
  await target.save();
  return target.toJSON();
}
