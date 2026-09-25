import { z } from "zod";
import { isValidDateString } from "../utils/date";

const effectiveFrom = z
  .string()
  .refine(isValidDateString, "effectiveFrom must be a valid YYYY-MM-DD date");

const macros = {
  calories: z.number().int().min(800).max(10000),
  protein: z.number().int().min(0).max(1000),
  carbs: z.number().int().min(0).max(2000),
  fat: z.number().int().min(0).max(1000),
};

// AUTO: server tự tính từ profile. MANUAL: user tự nhập macro.
// effectiveFrom bỏ trống = hôm nay theo timezone của user.
export const createGoalSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("AUTO"), effectiveFrom: effectiveFrom.optional() }),
  z.object({ mode: z.literal("MANUAL"), effectiveFrom: effectiveFrom.optional(), ...macros }),
]);

// { mode: "AUTO" } = tính lại từ profile hiện tại. Gửi macro (mode bỏ trống hoặc "MANUAL") = tự nhập.
export const updateGoalSchema = z.union([
  z.object({ mode: z.literal("AUTO") }),
  z.object({ mode: z.literal("MANUAL").optional(), ...macros }),
]);

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
