import { FoodLogModel } from "../models/foodLog.model";
import type { CreateFoodLogInput, UpdateFoodLogInput } from "../schemas/foodLog.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { calculateNutrition, rescaleSnapshot } from "../utils/foodNutrition";
import { getVisibleFood } from "./food.service";
import { getUserTimezone } from "./profile.service";

async function resolveDate(userId: string, date?: string) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const day = date ?? today;
  if (day > today) {
    throw AppError.badRequest("Cannot log food for a future date");
  }
  return day;
}

export async function listFoodLogs(userId: string, date?: string) {
  const day = date ?? todayInTimezone(await getUserTimezone(userId));
  const logs = await FoodLogModel.find({ userId, date: day }).sort({ createdAt: 1 });
  return { date: day, items: logs.map((l) => l.toJSON()) };
}

export async function createFoodLog(userId: string, input: CreateFoodLogInput) {
  const date = await resolveDate(userId, input.date);
  const food = await getVisibleFood(userId, input.foodId);

  const log = await FoodLogModel.create({
    userId,
    date,
    mealType: input.mealType,
    foodId: food._id,
    foodName: food.name,
    servingUnit: food.servingUnit,
    quantity: input.quantity,
    ...calculateNutrition(food, input.quantity),
  });
  return log.toJSON();
}

// Lọc theo userId: log của người khác trả 404 như thể không tồn tại
async function getOwnedLog(userId: string, logId: string) {
  const log = await FoodLogModel.findOne({ _id: logId, userId });
  if (!log) {
    throw AppError.notFound("Food log not found");
  }
  return log;
}

export async function updateFoodLog(userId: string, logId: string, input: UpdateFoodLogInput) {
  const log = await getOwnedLog(userId, logId);

  if (input.date) log.date = await resolveDate(userId, input.date);
  if (input.mealType) log.mealType = input.mealType;

  if (input.quantity && input.quantity !== log.quantity) {
    log.set({
      ...rescaleSnapshot(
        { calories: log.calories, protein: log.protein, carbs: log.carbs, fat: log.fat, fiber: log.fiber ?? 0 },
        log.quantity,
        input.quantity
      ),
      quantity: input.quantity,
    });
  }

  await log.save();
  return log.toJSON();
}

export async function deleteFoodLog(userId: string, logId: string) {
  const log = await getOwnedLog(userId, logId);
  await log.deleteOne();
}
