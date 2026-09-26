import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

// Bảo vệ các endpoint nội bộ do cron gọi: "Authorization: Bearer <CRON_SECRET>".
// Không cấu hình CRON_SECRET thì coi như endpoint không tồn tại.
export const cronAuth: RequestHandler = (req, _res, next) => {
  if (!env.CRON_SECRET) {
    throw AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
  }

  const header = req.headers.authorization ?? "";
  const provided = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(env.CRON_SECRET);

  // So sánh thời gian hằng số để không lộ secret qua thời gian phản hồi
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw AppError.unauthorized("Invalid cron secret");
  }
  next();
};
