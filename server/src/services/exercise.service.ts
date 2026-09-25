import type { QueryFilter } from "mongoose";
import { ExerciseModel, type Exercise } from "../models/exercise.model";
import type { CreateExerciseInput, ListExercisesQuery } from "../schemas/workout.schema";
import { AppError } from "../utils/AppError";
import { escapeRegex, visibleToUser } from "../utils/ownership";

export async function listExercises(userId: string, query: ListExercisesQuery) {
  const filter: QueryFilter<Exercise> =
    query.scope === "system"
      ? { createdBy: null }
      : query.scope === "custom"
        ? { createdBy: userId }
        : visibleToUser(userId);

  if (query.muscleGroup) filter.muscleGroup = query.muscleGroup;
  if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: "i" };

  const exercises = await ExerciseModel.find(filter).sort({ muscleGroup: 1, name: 1 });
  return exercises.map((e) => e.toJSON());
}

export async function getVisibleExercise(userId: string, exerciseId: string) {
  const exercise = await ExerciseModel.findOne({ _id: exerciseId, ...visibleToUser(userId) });
  if (!exercise) {
    throw AppError.notFound("Exercise not found");
  }
  return exercise;
}

// Trả về map id → exercise, báo lỗi nếu có id không tồn tại hoặc user không được dùng
export async function getVisibleExercisesByIds(userId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  const exercises = await ExerciseModel.find({ _id: { $in: unique }, ...visibleToUser(userId) });

  if (exercises.length !== unique.length) {
    const found = new Set(exercises.map((e) => e.id));
    throw AppError.badRequest("Some exercises were not found", {
      missingExerciseIds: unique.filter((id) => !found.has(id)),
    });
  }
  return new Map(exercises.map((e) => [e.id as string, e]));
}

export async function getExercise(userId: string, exerciseId: string) {
  return (await getVisibleExercise(userId, exerciseId)).toJSON();
}

export async function createExercise(userId: string, input: CreateExerciseInput) {
  const exercise = await ExerciseModel.create({ ...input, isCustom: true, createdBy: userId });
  return exercise.toJSON();
}
