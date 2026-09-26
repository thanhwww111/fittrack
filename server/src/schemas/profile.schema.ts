import { z } from "zod";
import { ACTIVITY_LEVELS, GENDERS, GOAL_TYPES } from "../constants/enums";
import { isValidTimezone } from "../utils/date";

export const updateProfileSchema = z
  .object({
    gender: z.enum(GENDERS),
    age: z.number().int().min(10).max(120),
    height: z.number().min(50).max(300),
    currentWeight: z.number().min(20).max(500),
    activityLevel: z.enum(ACTIVITY_LEVELS),
    goalType: z.enum(GOAL_TYPES),
    goalWeight: z.number().min(20).max(500),
    trainingDaysPerWeek: z.number().int().min(0).max(7),
    // kg/tuần, null = dùng mức mặc định theo goalType
    goalRate: z.number().min(0.1).max(1).nullable(),
    timezone: z.string().refine(isValidTimezone, "Invalid IANA timezone"),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
