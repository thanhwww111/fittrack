import type { RequestHandler } from "express";
import { UserModel } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/tokens";

// Đọc "Authorization: Bearer <accessToken>" và gắn req.user.
// Ngoài chữ ký JWT còn kiểm tra user vẫn tồn tại (đã xoá tài khoản thì token cũ vô hiệu)
// và token được cấp sau lần đổi mật khẩu gần nhất.
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw AppError.unauthorized("Missing access token");
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  const user = await UserModel.findById(payload.sub).select("+passwordChangedAt").lean();
  if (!user) {
    throw AppError.unauthorized("User no longer exists");
  }
  if (user.passwordChangedAt && (payload.iat ?? 0) * 1000 < user.passwordChangedAt.getTime()) {
    throw AppError.unauthorized("Session expired after password change");
  }

  req.user = { id: payload.sub };
  next();
};
