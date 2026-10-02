import { z } from "zod";
import { mealIdSchema } from "./meal.schema";
import { isValidDateString } from "../utils/date";

const date = z.string().refine(isValidDateString, "date must be a valid YYYY-MM-DD date");
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const quantity = z.number().positive("quantity must be greater than 0").max(10000);

// Không có calories/protein/...: backend tự tính từ Food, không tin số client gửi lên
export const createFoodLogSchema = z.object({
  date: date.optional(),
  mealType: mealIdSchema,
  foodId: objectId,
  quantity,
});

export const updateFoodLogSchema = z
  .object({ date, mealType: mealIdSchema, quantity })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export const listFoodLogsQuerySchema = z.object({
  date: date.optional(),
});

// toDate bỏ trống = hôm nay, toMealType bỏ trống = cùng bữa với nguồn
export const copyMealSchema = z.object({
  fromDate: date,
  fromMealType: mealIdSchema,
  toDate: date.optional(),
  toMealType: mealIdSchema.optional(),
});

export type CreateFoodLogInput = z.infer<typeof createFoodLogSchema>;
export type CopyMealInput = z.infer<typeof copyMealSchema>;
export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;
