import type { MealType } from "../constants/enums";
import { FoodLogModel } from "../models/foodLog.model";
import type {
  CopyMealInput,
  CreateFoodLogInput,
  UpdateFoodLogInput,
} from "../schemas/foodLog.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { calculateNutrition, rescaleSnapshot } from "../utils/foodNutrition";
import { getVisibleFood } from "./food.service";
import { getUserTimezone } from "./profile.service";

// Ngày log mặc định là hôm nay theo timezone của user, không cho log vào tương lai
export async function resolveLogDate(userId: string, date?: string) {
  const today = todayInTimezone(await getUserTimezone(userId));
  const day = date ?? today;
  if (day > today) {
    throw AppError.badRequest("Cannot log food for a future date");
  }
  return day;
}

type LoggableFood = Awaited<ReturnType<typeof getVisibleFood>>;

// Snapshot dinh dưỡng tính từ Food tại thời điểm log (dùng chung cho log lẻ và meal template)
export function buildFoodLog(
  userId: string,
  date: string,
  mealType: MealType,
  food: LoggableFood,
  quantity: number
) {
  return {
    userId,
    date,
    mealType,
    foodId: food._id,
    foodName: food.name,
    servingUnit: food.servingUnit,
    quantity,
    ...calculateNutrition(food, quantity),
  };
}

export async function listFoodLogs(userId: string, date?: string) {
  const day = date ?? todayInTimezone(await getUserTimezone(userId));
  const logs = await FoodLogModel.find({ userId, date: day }).sort({ createdAt: 1 });
  return { date: day, items: logs.map((l) => l.toJSON()) };
}

export async function createFoodLog(userId: string, input: CreateFoodLogInput) {
  const date = await resolveLogDate(userId, input.date);
  const food = await getVisibleFood(userId, input.foodId);

  const log = await FoodLogModel.create(buildFoodLog(userId, date, input.mealType, food, input.quantity));
  return log.toJSON();
}

// Chép các món của một bữa (vd: bữa sáng hôm qua) sang bữa khác. Chép nguyên snapshot,
// nên món đã bị xoá khỏi danh sách food vẫn chép được.
export async function copyMeal(userId: string, input: CopyMealInput) {
  const toDate = await resolveLogDate(userId, input.toDate);
  const toMealType = input.toMealType ?? input.fromMealType;
  if (toDate === input.fromDate && toMealType === input.fromMealType) {
    throw AppError.badRequest("Source and destination meal are the same");
  }

  const source = await FoodLogModel.find({
    userId,
    date: input.fromDate,
    mealType: input.fromMealType,
  })
    .sort({ createdAt: 1 })
    .lean();
  if (source.length === 0) {
    throw AppError.notFound("No food logged for that meal");
  }

  const created = await FoodLogModel.insertMany(
    source.map(({ _id, createdAt, updatedAt, __v, ...log }) => ({
      ...log,
      date: toDate,
      mealType: toMealType,
    }))
  );
  return { date: toDate, mealType: toMealType, items: created.map((l) => l.toJSON()) };
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

  if (input.date) log.date = await resolveLogDate(userId, input.date);
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
