import { z } from "zod";
import { MEAL_TYPES } from "../constants/enums";
import { isValidDateString } from "../utils/date";

const date = z.string().refine(isValidDateString, "date must be a valid YYYY-MM-DD date");
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const name = z.string().trim().min(1).max(100);

const items = z
  .array(z.object({ foodId: objectId, quantity: z.number().positive().max(10000) }))
  .min(1, "Meal template needs at least one item")
  .max(30);

export const createMealTemplateSchema = z.object({ name, items });

export const updateMealTemplateSchema = z
  .object({ name, items })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

// Lưu các món đã ghi của một bữa thành template
export const mealTemplateFromMealSchema = z.object({
  name,
  date,
  mealType: z.enum(MEAL_TYPES),
});

// Ghi tất cả món của template vào một bữa. date bỏ trống = hôm nay
export const applyMealTemplateSchema = z.object({
  date: date.optional(),
  mealType: z.enum(MEAL_TYPES),
});

export type CreateMealTemplateInput = z.infer<typeof createMealTemplateSchema>;
export type UpdateMealTemplateInput = z.infer<typeof updateMealTemplateSchema>;
export type MealTemplateFromMealInput = z.infer<typeof mealTemplateFromMealSchema>;
export type ApplyMealTemplateInput = z.infer<typeof applyMealTemplateSchema>;
