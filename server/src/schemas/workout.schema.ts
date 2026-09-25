import { z } from "zod";
import { EQUIPMENTS, MUSCLE_GROUPS, WORKOUT_STATUSES } from "../constants/enums";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

// ---------- Exercise ----------

export const listExercisesQuerySchema = z.object({
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  search: z.string().trim().max(100).optional(),
  scope: z.enum(["all", "system", "custom"]).default("all"),
});

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENTS),
  description: z.string().trim().max(1000).default(""),
});

// ---------- Workout template ----------

const templateExercise = z.object({
  exerciseId: objectId,
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(100),
  restSeconds: z.number().int().min(0).max(900).default(90),
});

// Thứ tự bài tập = thứ tự trong mảng, server tự gán `order`
export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  exercises: z.array(templateExercise).min(1, "Template needs at least one exercise").max(30),
});

export const updateTemplateSchema = createTemplateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

// ---------- Workout session ----------

export const startSessionSchema = z
  .object({
    templateId: objectId.optional(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .refine((d) => d.templateId || d.name, "Either templateId or name is required");

export const listSessionsQuerySchema = z.object({
  status: z.enum(WORKOUT_STATUSES).optional(),
  ...pagination,
});

export const recordSetSchema = z.object({
  exerciseId: objectId,
  // Bỏ trống = set tiếp theo. Truyền số của set đã có = sửa set đó.
  setNumber: z.number().int().min(1).optional(),
  weight: z.number().min(0, "weight cannot be negative").max(1000),
  reps: z.number().int().min(1, "reps must be at least 1").max(1000),
});

export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type RecordSetInput = z.infer<typeof recordSetSchema>;
