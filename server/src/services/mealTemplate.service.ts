import { FoodModel } from "../models/food.model";
import { FoodLogModel } from "../models/foodLog.model";
import { MealTemplateModel } from "../models/mealTemplate.model";
import type {
  ApplyMealTemplateInput,
  CreateMealTemplateInput,
  MealTemplateFromMealInput,
  UpdateMealTemplateInput,
} from "../schemas/mealTemplate.schema";
import { AppError } from "../utils/AppError";
import { calculateNutrition, sumNutrition, type NutritionValues } from "../utils/foodNutrition";
import { visibleToUser } from "../utils/ownership";
import { buildFoodLog, resolveLogDate } from "./foodLog.service";

type TemplateDoc = InstanceType<typeof MealTemplateModel>;

async function visibleFoods(userId: string, foodIds: string[]) {
  const foods = await FoodModel.find({ _id: { $in: foodIds }, ...visibleToUser(userId) });
  return new Map(foods.map((f) => [f.id as string, f]));
}

async function assertFoodsVisible(userId: string, items: { foodId: string }[]) {
  const ids = [...new Set(items.map((i) => i.foodId))];
  const foods = await visibleFoods(userId, ids);
  if (foods.size !== ids.length) {
    throw AppError.notFound("Food not found");
  }
}

// Kèm tên món + dinh dưỡng tính theo Food hiện tại. Món đã bị xoá thì available = false
// và không tính vào tổng.
async function present(userId: string, templates: TemplateDoc[]) {
  const ids = templates.flatMap((t) => t.items.map((i) => String(i.foodId)));
  const foods = await visibleFoods(userId, [...new Set(ids)]);

  return templates.map((t) => {
    const items = t.items.map((item) => {
      const food = foods.get(String(item.foodId));
      return {
        foodId: String(item.foodId),
        quantity: item.quantity,
        available: Boolean(food),
        foodName: food?.name ?? null,
        servingUnit: food?.servingUnit ?? null,
        nutrition: food ? calculateNutrition(food, item.quantity) : null,
      };
    });
    const totals = sumNutrition(
      items.map((i) => i.nutrition).filter((n): n is NutritionValues => n !== null)
    );
    return { id: t.id as string, name: t.name, items, totals };
  });
}

async function getOwnedTemplate(userId: string, templateId: string) {
  const template = await MealTemplateModel.findOne({ _id: templateId, userId });
  if (!template) {
    throw AppError.notFound("Meal template not found");
  }
  return template;
}

export async function listMealTemplates(userId: string) {
  const templates = await MealTemplateModel.find({ userId }).sort({ name: 1 });
  return present(userId, templates);
}

export async function createMealTemplate(userId: string, input: CreateMealTemplateInput) {
  await assertFoodsVisible(userId, input.items);
  const template = await MealTemplateModel.create({ userId, ...input });
  return (await present(userId, [template]))[0];
}

export async function createFromMeal(userId: string, input: MealTemplateFromMealInput) {
  const logs = await FoodLogModel.find({ userId, date: input.date, mealType: input.mealType })
    .sort({ createdAt: 1 })
    .lean();
  if (logs.length === 0) {
    throw AppError.notFound("No food logged for that meal");
  }

  // Bỏ món đã bị xoá khỏi danh sách food vì template tính lại theo Food hiện tại
  const foods = await visibleFoods(userId, logs.map((l) => String(l.foodId)));
  const items = logs
    .filter((l) => foods.has(String(l.foodId)))
    .map((l) => ({ foodId: String(l.foodId), quantity: l.quantity }));
  if (items.length === 0) {
    throw AppError.badRequest("All foods in that meal have been deleted");
  }

  const template = await MealTemplateModel.create({ userId, name: input.name, items });
  return (await present(userId, [template]))[0];
}

export async function updateMealTemplate(
  userId: string,
  templateId: string,
  input: UpdateMealTemplateInput
) {
  const template = await getOwnedTemplate(userId, templateId);
  if (input.items) await assertFoodsVisible(userId, input.items);
  template.set(input);
  await template.save();
  return (await present(userId, [template]))[0];
}

export async function deleteMealTemplate(userId: string, templateId: string) {
  const template = await getOwnedTemplate(userId, templateId);
  await template.deleteOne();
}

// Ghi mọi món còn tồn tại của template vào bữa được chọn, mỗi món một FoodLog
export async function applyMealTemplate(
  userId: string,
  templateId: string,
  input: ApplyMealTemplateInput
) {
  const template = await getOwnedTemplate(userId, templateId);
  const date = await resolveLogDate(userId, input.date);
  const foods = await visibleFoods(userId, template.items.map((i) => String(i.foodId)));

  const docs = template.items.flatMap((item) => {
    const food = foods.get(String(item.foodId));
    return food ? [buildFoodLog(userId, date, input.mealType, food, item.quantity)] : [];
  });
  if (docs.length === 0) {
    throw AppError.badRequest("All foods in this template have been deleted");
  }

  const created = await FoodLogModel.insertMany(docs);
  return {
    date,
    mealType: input.mealType,
    items: created.map((l) => l.toJSON()),
    skipped: template.items.length - docs.length,
  };
}
