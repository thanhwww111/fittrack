import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { seedExercises } from "./seedExercises";
import { seedFoods } from "./seedFoods";

// npm run seed — nạp dữ liệu hệ thống (food, exercise), chạy lại nhiều lần an toàn
async function main() {
  await connectDB();

  const foods = await seedFoods();
  console.log(`🌱 Foods: ${foods.upsertedCount} inserted, ${foods.modifiedCount} updated`);

  const exercises = await seedExercises();
  console.log(`🌱 Exercises: ${exercises.upsertedCount} inserted, ${exercises.modifiedCount} updated`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
