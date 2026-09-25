import { z } from "zod";
import { MEAL_TYPES } from "../constants/enums";

export const mealSuggestionInputSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  // Ví dụ "không ăn cay, có ức gà và trứng trong tủ lạnh"
  preferences: z.string().trim().max(200).optional(),
});

export type MealSuggestionInput = z.infer<typeof mealSuggestionInputSchema>;
