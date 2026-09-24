import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { env } from "../../src/config/env";

// Gọi ở đầu mỗi file test cần database
export function useTestDatabase() {
  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);
    // Chặn việc lỡ trỏ test vào database thật rồi xoá sạch dữ liệu
    if (!mongoose.connection.name.endsWith("_test")) {
      throw new Error(`Refusing to run tests against database "${mongoose.connection.name}"`);
    }
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });

  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
}
