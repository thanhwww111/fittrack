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
