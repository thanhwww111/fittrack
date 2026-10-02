import { DEFAULT_MEALS, isMealId } from "../constants/meals";
import { CustomMealModel } from "../models/customMeal.model";
import { createMealSchema } from "../schemas/meal.schema";
import { AppError } from "../utils/AppError";

const present = (meal: { _id: unknown; name: string }) => ({ id: `CUSTOM_${String(meal._id)}`, name: meal.name, isCustom: true });

export async function listMeals(userId: string) {
  const meals = await CustomMealModel.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean();
  return [...DEFAULT_MEALS, ...meals.map(present)];
}

export async function resolveMeal(userId: string, id: string) {
  if (!isMealId(id)) throw AppError.badRequest("Invalid meal id");
  const standard = DEFAULT_MEALS.find(meal => meal.id === id);
  if (standard) return standard;
  const meal = await CustomMealModel.findOne({ _id: id.slice(7), userId }).lean();
  if (!meal) throw AppError.notFound("Meal not found");
  return present(meal);
}

export async function createMeal(userId: string, input: { name: string }) {
  const { name } = createMealSchema.parse(input);
  const normalizedName = name.toLowerCase();
  if (DEFAULT_MEALS.some(meal => meal.name.toLowerCase() === normalizedName)) {
    throw AppError.conflict("A meal with this name already exists");
  }
  try {
    return present(await CustomMealModel.create({ userId, name, normalizedName }));
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw AppError.conflict("A meal with this name already exists");
    throw error;
  }
}
