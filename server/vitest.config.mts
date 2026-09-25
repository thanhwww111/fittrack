import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Các file test dùng chung một database nên chạy tuần tự
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      MONGO_URI: process.env.MONGO_URI_TEST ?? "mongodb://127.0.0.1:27017/fittrack_test",
      JWT_SECRET: "test-access-secret-at-least-32-characters",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-characters",
      BCRYPT_ROUNDS: "4",
    },
  },
});
