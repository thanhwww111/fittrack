import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // Số proxy đứng trước app (Render/Railway = 1). Cần để rate limit lấy đúng IP người dùng.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Danh sách origin được gọi API từ trình duyệt, cách nhau bằng dấu phẩy.
  // App mobile không bị CORS chặn nên production có thể để trống.
  // Không có key thì các API /ai trả 503, phần còn lại của app vẫn chạy bình thường
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((v) => v?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;