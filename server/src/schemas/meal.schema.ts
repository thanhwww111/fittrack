import { z } from "zod";
import { isMealId } from "../constants/meals";

export const mealIdSchema = z.string().refine(isMealId, "Invalid meal id");
export const createMealSchema = z.object({
  name: z.string().transform(value => value.trim().replace(/\s+/g, " ")).pipe(z.string().min(1).max(40)),
});
