import type { QueryFilter } from "mongoose";
import { FoodModel, type Food } from "../models/food.model";
import type { CreateFoodInput, ListFoodsQuery, UpdateFoodInput } from "../schemas/food.schema";
import { AppError } from "../utils/AppError";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Food user được xem: food hệ thống + food của chính user
function visibleTo(userId: string): QueryFilter<Food> {
  return { $or: [{ createdBy: null }, { createdBy: userId }] };
}

export async function listFoods(userId: string, query: ListFoodsQuery) {
  const filter: QueryFilter<Food> =
    query.scope === "system"
      ? { createdBy: null }
      : query.scope === "custom"
        ? { createdBy: userId }
        : visibleTo(userId);

  if (query.search) {
    filter.name = { $regex: escapeRegex(query.search), $options: "i" };
  }

  const [items, total] = await Promise.all([
    FoodModel.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    FoodModel.countDocuments(filter),
  ]);

  return {
    items: items.map((f) => f.toJSON()),
    page: query.page,
    limit: query.limit,
    total,
  };
}

export async function getVisibleFood(userId: string, foodId: string) {
  const food = await FoodModel.findOne({ _id: foodId, ...visibleTo(userId) });
  if (!food) {
    throw AppError.notFound("Food not found");
  }
  return food;
}

export async function getFood(userId: string, foodId: string) {
  return (await getVisibleFood(userId, foodId)).toJSON();
}

export async function createFood(userId: string, input: CreateFoodInput) {
  const food = await FoodModel.create({ ...input, isCustom: true, createdBy: userId });
  return food.toJSON();
}

// Chỉ sửa/xoá được food do chính user tạo. Food hệ thống thì chỉ đọc.
async function getOwnedFood(userId: string, foodId: string) {
  const food = await getVisibleFood(userId, foodId);
  if (!food.createdBy) {
    throw AppError.forbidden("System foods cannot be modified");
  }
  return food;
}

export async function updateFood(userId: string, foodId: string, input: UpdateFoodInput) {
  const food = await getOwnedFood(userId, foodId);
  food.set(input);
  await food.save();
  return food.toJSON();
}

// Xoá food không ảnh hưởng FoodLog cũ vì log đã lưu snapshot
export async function deleteFood(userId: string, foodId: string) {
  const food = await getOwnedFood(userId, foodId);
  await food.deleteOne();
}
