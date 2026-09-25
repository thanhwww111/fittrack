import mongoose from "mongoose";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import app from "./app";

async function start() {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} (${env.NODE_ENV})`);
    });

    // Render/Railway gửi SIGTERM khi deploy bản mới: ngừng nhận request,
    // chờ request đang xử lý xong rồi mới đóng kết nối DB
    const shutdown = (signal: string) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
