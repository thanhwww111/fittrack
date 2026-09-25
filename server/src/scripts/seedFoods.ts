import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { FoodModel } from "../models/food.model";
import type { CreateFoodInput } from "../schemas/food.schema";

// Giá trị tham khảo từ USDA FoodData Central, tính trên 1 khẩu phần
export const SYSTEM_FOODS: CreateFoodInput[] = [
  { name: "Egg", servingSize: 1, servingUnit: "piece", calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 },
  { name: "Chicken Breast", servingSize: 100, servingUnit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: "White Rice (cooked)", servingSize: 100, servingUnit: "g", calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
  { name: "Tofu", servingSize: 100, servingUnit: "g", calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3 },
  { name: "Whole Milk", servingSize: 100, servingUnit: "ml", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 },
  { name: "Banana", servingSize: 100, servingUnit: "g", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  { name: "Salmon", servingSize: 100, servingUnit: "g", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  { name: "Pork Loin (lean)", servingSize: 100, servingUnit: "g", calories: 143, protein: 26, carbs: 0, fat: 3.5, fiber: 0 },
  { name: "Potato (boiled)", servingSize: 100, servingUnit: "g", calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1, fiber: 1.8 },
  { name: "Oats", servingSize: 100, servingUnit: "g", calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
];

// Upsert theo tên nên chạy lại nhiều lần không bị trùng
export async function seedFoods() {
  const ops = SYSTEM_FOODS.map((food) => ({
    updateOne: {
      filter: { name: food.name, createdBy: null },
      update: { $set: { ...food, isCustom: false, createdBy: null } },
      upsert: true,
    },
  }));
  return FoodModel.bulkWrite(ops);
}

if (require.main === module) {
  connectDB()
    .then(seedFoods)
    .then((result) => {
      console.log(`🌱 Seeded foods: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
