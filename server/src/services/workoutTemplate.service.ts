import { WorkoutTemplateModel } from "../models/workoutTemplate.model";
import type { CreateTemplateInput, UpdateTemplateInput } from "../schemas/workout.schema";
import { AppError } from "../utils/AppError";
import { getVisibleExercisesByIds } from "./exercise.service";

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

// Session cũ tạo từ template vẫn giữ nguyên vì đã copy bài tập + tên vào session
export async function deleteTemplate(userId: string, templateId: string) {
  const template = await getOwnedTemplate(userId, templateId);
  await template.deleteOne();
}
