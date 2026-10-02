import { WorkoutTemplateModel } from "../models/workoutTemplate.model";
import { ExerciseModel } from "../models/exercise.model";
import { SUGGESTED_WORKOUTS } from "../constants/programPresets";
import type { CreateTemplateInput, UpdateTemplateInput } from "../schemas/workout.schema";
import { AppError } from "../utils/AppError";
import { getVisibleExercisesByIds } from "./exercise.service";
import { removeTemplateFromPrograms } from "./weeklyProgram.service";

async function buildExercises(userId: string, exercises: CreateTemplateInput["exercises"]) {
  await getVisibleExercisesByIds(
    userId,
    exercises.map((e) => e.exerciseId)
  );
  return exercises.map((e, index) => ({ ...e, order: index }));
}

export async function getOwnedTemplate(userId: string, templateId: string) {
  const template = await WorkoutTemplateModel.findOne({ _id: templateId, userId });
  if (!template) {
    throw AppError.notFound("Workout template not found");
  }
  return template;
}

export async function listTemplates(userId: string) {
  const templates = await WorkoutTemplateModel.find({ userId }).sort({ updatedAt: -1 });
  return templates.map((t) => t.toJSON());
}

export async function getTemplate(userId: string, templateId: string) {
  const template = await getOwnedTemplate(userId, templateId);
  await template.populate("exercises.exerciseId", "name muscleGroup equipment");
  return template.toJSON();
}

export async function createTemplate(userId: string, input: CreateTemplateInput) {
  const template = await WorkoutTemplateModel.create({
    userId,
    name: input.name,
    exercises: await buildExercises(userId, input.exercises),
  });
  return template.toJSON();
}

export async function applySuggestion(userId: string, key: string) {
  const suggestion = SUGGESTED_WORKOUTS.find((workout) => workout.key === key);
  if (!suggestion) throw AppError.notFound("Workout suggestion not found");

  const filter = { userId, suggestedKey: suggestion.key };
  const existing = await WorkoutTemplateModel.findOne(filter);
  if (existing) return existing.toJSON();

  const names = suggestion.exercises.map((exercise) => exercise.name);
  const exercises = await ExerciseModel.find({ name: { $in: names }, isCustom: false })
    .select("name").lean();
  const ids = new Map(exercises.map((exercise) => [exercise.name, exercise._id]));
  const missing = names.filter((name) => !ids.has(name));
  if (missing.length) {
    throw new AppError(500, "Exercise library is incomplete", { missingExercises: missing });
  }

  try {
    const template = await WorkoutTemplateModel.findOneAndUpdate(filter, {
      $setOnInsert: {
        ...filter,
        name: suggestion.name,
        exercises: suggestion.exercises.map((exercise, order) => ({
          exerciseId: ids.get(exercise.name), order,
          targetSets: exercise.sets, targetReps: exercise.reps, restSeconds: exercise.rest,
        })),
      },
    }, { upsert: true, returnDocument: "after", runValidators: true });
    return template!.toJSON();
  } catch (error) {
    // Hai thiết bị có thể lưu cùng lúc; unique index đảm bảo chỉ một bản cho mỗi user.
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const template = await WorkoutTemplateModel.findOne(filter);
      if (template) return template.toJSON();
    }
    throw error;
  }
}

export async function updateTemplate(userId: string, templateId: string, input: UpdateTemplateInput) {
  const template = await getOwnedTemplate(userId, templateId);

  if (input.name) template.name = input.name;
  if (input.exercises) {
    template.set("exercises", await buildExercises(userId, input.exercises));
  }

  await template.save();
  return template.toJSON();
}

export async function duplicateTemplate(userId: string, templateId: string) {
  const source = await getOwnedTemplate(userId, templateId);
  const copy = await WorkoutTemplateModel.create({
    userId,
    name: `${source.name} (bản sao)`.slice(0, 100),
    exercises: source.exercises.map((e) => e.toObject()),
  });
  return copy.toJSON();
}

// Session cũ tạo từ template vẫn giữ nguyên vì đã copy bài tập + tên vào session.
// Lịch tuần đang dùng template này thì ngày đó thành ngày nghỉ.
export async function deleteTemplate(userId: string, templateId: string) {
  const template = await getOwnedTemplate(userId, templateId);
  await template.deleteOne();
  await removeTemplateFromPrograms(userId, templateId);
}
