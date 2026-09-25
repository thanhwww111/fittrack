import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/tokens";

// Đọc "Authorization: Bearer <accessToken>" và gắn req.user
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw AppError.unauthorized("Missing access token");
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  req.user = { id: payload.sub };
  next();
};
