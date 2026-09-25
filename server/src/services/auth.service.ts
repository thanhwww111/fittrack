import bcrypt from "bcrypt";
import { env } from "../config/env";
import { BodyMeasurementModel } from "../models/bodyMeasurement.model";
import { ExerciseModel } from "../models/exercise.model";
import { FoodModel } from "../models/food.model";
import { FoodLogModel } from "../models/foodLog.model";
import { MealTemplateModel } from "../models/mealTemplate.model";
import { NotificationSettingsModel } from "../models/notificationSettings.model";
import { NutritionTargetModel } from "../models/nutritionTarget.model";
import { PersonalRecordModel } from "../models/personalRecord.model";
import { PushDeviceModel } from "../models/pushDevice.model";
import { RefreshTokenModel } from "../models/refreshToken.model";
import { UserModel, type UserDocument } from "../models/user.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WaterLogModel } from "../models/waterLog.model";
import { WorkoutSessionModel } from "../models/workoutSession.model";
import { WorkoutTemplateModel } from "../models/workoutTemplate.model";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateMeInput,
} from "../schemas/auth.schema";
import { AppError } from "../utils/AppError";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";

async function issueTokens(userId: string) {
  const accessToken = signAccessToken(userId);
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(userId);

  await RefreshTokenModel.create({
    userId,
    jti,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

function buildAuthResult(user: UserDocument, tokens: { accessToken: string; refreshToken: string }) {
  return { user: user.toJSON(), ...tokens };
}

export async function register(input: RegisterInput) {
  const exists = await UserModel.exists({ email: input.email });
  if (exists) {
    throw AppError.conflict("Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await UserModel.create({ name: input.name, email: input.email, passwordHash });

  // Không có transaction (Mongo standalone) nên tự rollback user nếu tạo profile lỗi
  try {
    await UserProfileModel.create({ userId: user._id });
  } catch (err) {
    await UserModel.deleteOne({ _id: user._id });
    throw err;
  }

  const tokens = await issueTokens(user.id);
  return buildAuthResult(user, tokens);
}

export async function login(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");

  // Cùng một thông báo cho cả hai trường hợp để không lộ email nào đã đăng ký
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !valid) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const tokens = await issueTokens(user.id);
  return buildAuthResult(user, tokens);
}

// Refresh token rotation: mỗi token chỉ dùng được một lần.
// Nếu token hợp lệ về chữ ký nhưng không còn trong DB (đã bị dùng) thì
// coi như bị đánh cắp và thu hồi toàn bộ phiên của user đó.
export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const stored = await RefreshTokenModel.findOneAndDelete({
    jti: payload.jti,
    tokenHash: hashToken(refreshToken),
  });

  if (!stored) {
    await RefreshTokenModel.deleteMany({ userId: payload.sub });
    throw AppError.unauthorized("Refresh token has been revoked");
  }

  const userExists = await UserModel.exists({ _id: payload.sub });
  if (!userExists) {
    throw AppError.unauthorized("User no longer exists");
  }

  return issueTokens(payload.sub);
}

export async function logout(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return;

  await RefreshTokenModel.deleteOne({ jti: payload.jti, tokenHash: hashToken(refreshToken) });
}

export async function getMe(userId: string) {
  const [user, profile] = await Promise.all([
    UserModel.findById(userId),
    UserProfileModel.findOne({ userId }),
  ]);

  if (!user) {
    throw AppError.unauthorized("User no longer exists");
  }

  return { user: user.toJSON(), profile: profile?.toJSON() ?? null };
}

export async function updateMe(userId: string, input: UpdateMeInput) {
  const user = await UserModel.findByIdAndUpdate(userId, { $set: input }, { returnDocument: "after", runValidators: true });
  if (!user) {
    throw AppError.unauthorized("User no longer exists");
  }
  return user.toJSON();
}

async function getUserWithPassword(userId: string, password: string, field: string) {
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user) {
    throw AppError.unauthorized("User no longer exists");
  }
  // 400 thay vì 401 để client không hiểu nhầm là phiên đăng nhập hết hạn
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw AppError.badRequest("Current password is incorrect", [
      { path: field, message: "Current password is incorrect" },
    ]);
  }
  return user;
}

// Đổi mật khẩu thì đăng xuất mọi thiết bị khác: thu hồi toàn bộ refresh token rồi cấp phiên mới
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await getUserWithPassword(userId, input.currentPassword, "currentPassword");
  user.passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await user.save();

  await RefreshTokenModel.deleteMany({ userId });
  const tokens = await issueTokens(user.id);
  return buildAuthResult(user, tokens);
}

// Xoá vĩnh viễn tài khoản và mọi dữ liệu của user (cần nhập lại mật khẩu)
export async function deleteAccount(userId: string, password: string) {
  await getUserWithPassword(userId, password, "password");

  const owned = { userId };
  await Promise.all([
    BodyMeasurementModel.deleteMany(owned),
    FoodLogModel.deleteMany(owned),
    MealTemplateModel.deleteMany(owned),
    NotificationSettingsModel.deleteMany(owned),
    NutritionTargetModel.deleteMany(owned),
    PersonalRecordModel.deleteMany(owned),
    PushDeviceModel.deleteMany(owned),
    RefreshTokenModel.deleteMany(owned),
    UserProfileModel.deleteMany(owned),
    WaterLogModel.deleteMany(owned),
    WorkoutSessionModel.deleteMany(owned),
    WorkoutTemplateModel.deleteMany(owned),
    FoodModel.deleteMany({ createdBy: userId }),
    ExerciseModel.deleteMany({ createdBy: userId }),
  ]);
  await UserModel.deleteOne({ _id: userId });
}
