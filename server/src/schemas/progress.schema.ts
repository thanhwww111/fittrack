import { z } from "zod";
import { isValidDateString } from "../utils/date";

const date = z.string().refine(isValidDateString, "must be a valid YYYY-MM-DD date");
const circumference = z.number().min(10).max(300); // cm

export const MAX_RANGE_DAYS = 366;

export const upsertMeasurementSchema = z.object({
  date: date.optional(),
  weight: z.number().min(20).max(500),
  bodyFat: z.number().min(1).max(70).optional(),
  chest: circumference.optional(),
  waist: circumference.optional(),
  arm: circumference.optional(),
  thigh: circumference.optional(),
});

// from/to bỏ trống thì service tự lấy khoảng mặc định
export const dateRangeQuerySchema = z
  .object({ from: date.optional(), to: date.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, "from must be before or equal to to");

export const weeksQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

export type UpsertMeasurementInput = z.infer<typeof upsertMeasurementSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
