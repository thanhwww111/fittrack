import { z } from "zod";
import { mealIdSchema } from "./meal.schema";

export const mealSuggestionInputSchema = z.object({
  mealType: mealIdSchema,
  // Ví dụ "không ăn cay, có ức gà và trứng trong tủ lạnh"
  preferences: z.string().trim().max(200).optional(),
});

export type MealSuggestionInput = z.infer<typeof mealSuggestionInputSchema>;

export const foodEstimateInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
});

export type FoodEstimateInput = z.infer<typeof foodEstimateInputSchema>;
