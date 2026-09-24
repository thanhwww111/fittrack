import bcrypt from "bcrypt";
import { env } from "../config/env";
import { UserModel, type UserDocument } from "../models/user.model";
import { UserProfileModel } from "../models/userProfile.model";
import { RefreshTokenModel } from "../models/refreshToken.model";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";
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
