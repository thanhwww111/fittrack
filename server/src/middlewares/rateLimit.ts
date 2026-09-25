import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

// Chống brute-force mật khẩu: tối đa 10 request / 15 phút / IP cho các route auth nhạy cảm
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { message: "Too many requests, please try again later" },
    });
  },
});

// Giới hạn chi phí gọi AI: 10 lần / giờ / user. Phải đặt sau `authenticate` để có req.user.
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.id,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { message: "AI request limit reached, please try again in an hour" },
    });
  },
});
