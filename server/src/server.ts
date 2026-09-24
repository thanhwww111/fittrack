import { env } from "./config/env";
import { connectDB } from "./config/db";
import app from "./app";

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();