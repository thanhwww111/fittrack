import { UserProfileModel } from "../models/userProfile.model";
import type { UpdateProfileInput } from "../schemas/profile.schema";
import { AppError } from "../utils/AppError";
import { DEFAULT_TIMEZONE, todayInTimezone } from "../utils/date";

export async function getProfileDocument(userId: string) {
  const profile = await UserProfileModel.findOne({ userId });
  if (!profile) {
    throw AppError.notFound("Profile not found");
  }
  return profile;
}

export async function getProfile(userId: string) {
  const profile = await getProfileDocument(userId);
  return profile.toJSON();
}

export async function getUserTimezone(userId: string) {
  const profile = await UserProfileModel.findOne({ userId }).select("timezone").lean();
  return profile?.timezone ?? DEFAULT_TIMEZONE;
}

// Giảm cân thì goalWeight phải nhỏ hơn cân hiện tại, tăng cơ thì phải lớn hơn
function assertGoalWeightConsistent(profile: {
  goalType?: string | null;
  currentWeight?: number | null;
  goalWeight?: number | null;
}) {
  const { goalType, currentWeight, goalWeight } = profile;
  if (currentWeight == null || goalWeight == null) return;

  if (goalType === "WEIGHT_LOSS" && goalWeight >= currentWeight) {
    throw AppError.badRequest("goalWeight must be lower than currentWeight for WEIGHT_LOSS");
  }
  if (goalType === "MUSCLE_GAIN" && goalWeight <= currentWeight) {
    throw AppError.badRequest("goalWeight must be higher than currentWeight for MUSCLE_GAIN");
  }
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const profile = await getProfileDocument(userId);

  assertGoalWeightConsistent({
    goalType: input.goalType ?? profile.goalType,
    currentWeight: input.currentWeight ?? profile.currentWeight,
    goalWeight: input.goalWeight ?? profile.goalWeight,
  });

  // Đặt mục tiêu mới (hoặc lần đầu) thì lấy cân hiện tại làm điểm xuất phát để tính % tiến độ
  const goalChanged =
    (input.goalType !== undefined && input.goalType !== profile.goalType) ||
    (input.goalWeight !== undefined && input.goalWeight !== profile.goalWeight);
  const goalWeight = input.goalWeight ?? profile.goalWeight;
  const weight = input.currentWeight ?? profile.currentWeight;

  profile.set(input);
  if (weight != null && goalWeight != null && (goalChanged || profile.startWeight == null)) {
    profile.startWeight = weight;
    profile.goalStartDate = todayInTimezone(profile.timezone);
  }
  await profile.save();
  return profile.toJSON();
}
