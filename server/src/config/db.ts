import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB() {
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
  });

  await mongoose.connect(env.MONGO_URI);
  console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);
}