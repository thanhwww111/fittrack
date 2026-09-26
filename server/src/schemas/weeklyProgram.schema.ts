import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const programDays = z
  .array(z.object({ dayOfWeek: z.number().int().min(1).max(7), templateId: objectId }))
  .min(1, "A weekly program needs at least one training day")
  .max(7)
  .refine(
    (days) => new Set(days.map((d) => d.dayOfWeek)).size === days.length,
    "Each day of the week can only have one workout"
  );

export const createWeeklyProgramSchema = z.object({
  name: z.string().trim().min(1).max(100),
  days: programDays,
});

export const updateWeeklyProgramSchema = createWeeklyProgramSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export type CreateWeeklyProgramInput = z.infer<typeof createWeeklyProgramSchema>;
export type UpdateWeeklyProgramInput = z.infer<typeof updateWeeklyProgramSchema>;
