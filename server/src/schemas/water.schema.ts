import { z } from "zod";
import { isValidDateString } from "../utils/date";

const date = z.string().refine(isValidDateString, "date must be a valid YYYY-MM-DD date");

export const waterQuerySchema = z.object({ date: date.optional() });

// Cộng thêm (số âm = bớt đi khi bấm nhầm). Tổng không xuống dưới 0.
export const addWaterSchema = z.object({
  date: date.optional(),
  amount: z.number().int().min(-5000).max(5000).refine((n) => n !== 0, "amount cannot be 0"),
});

export const setWaterSchema = z.object({
  date: date.optional(),
  amount: z.number().int().min(0).max(20000),
});

export type AddWaterInput = z.infer<typeof addWaterSchema>;
export type SetWaterInput = z.infer<typeof setWaterSchema>;
