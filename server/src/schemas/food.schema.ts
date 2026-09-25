import { z } from "zod";
import { SERVING_UNITS } from "../constants/enums";

const nutrient = z.number().min(0).max(5000);

export const createFoodSchema = z.object({
  name: z.string().trim().min(1).max(100),
  servingSize: z.number().positive().max(10000),
  servingUnit: z.enum(SERVING_UNITS),
  calories: nutrient,
  protein: nutrient,
  carbs: nutrient,
  fat: nutrient,
  fiber: nutrient.default(0),
});

export const updateFoodSchema = createFoodSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export const listFoodsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  // "system" = food có sẵn, "custom" = food user tự tạo
  scope: z.enum(["all", "system", "custom"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;
export type ListFoodsQuery = z.infer<typeof listFoodsQuerySchema>;
