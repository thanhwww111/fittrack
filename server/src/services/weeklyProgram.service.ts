import type { Types } from "mongoose";
import { findPreset, PROGRAM_PRESETS } from "../constants/programPresets";
import { ExerciseModel } from "../models/exercise.model";
import { WeeklyProgramModel } from "../models/weeklyProgram.model";
import { WorkoutTemplateModel } from "../models/workoutTemplate.model";
import type {
  CreateWeeklyProgramInput,
  UpdateWeeklyProgramInput,
} from "../schemas/weeklyProgram.schema";
import { AppError } from "../utils/AppError";
import { todayInTimezone } from "../utils/date";
import { getUserTimezone } from "./profile.service";

type ProgramDoc = NonNullable<Awaited<ReturnType<typeof WeeklyProgramModel.findOne>>>;

// 1 = thứ Hai ... 7 = Chủ nhật, theo ngày địa phương của user
function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

// Gắn tên + số bài của template vào từng ngày để app hiển thị không cần gọi thêm
async function serialize(programs: ProgramDoc[]) {
  const ids = programs.flatMap((p) => p.days.map((d) => d.templateId));
  const templates = await WorkoutTemplateModel.find({ _id: { $in: ids } })
    .select("name exercises")
    .lean();
  const byId = new Map(templates.map((t) => [String(t._id), t]));

  return programs.map((program) => {
    const json = program.toJSON() as Record<string, unknown>;
    json.days = [...program.days]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((d) => {
        const template = byId.get(String(d.templateId));
        return {
          dayOfWeek: d.dayOfWeek,
          templateId: String(d.templateId),
          templateName: template?.name ?? null,
          exerciseCount: template?.exercises.length ?? 0,
        };
      });
    return json;
  });
}

async function serializeOne(program: ProgramDoc) {
  return (await serialize([program]))[0];
}

async function assertOwnTemplates(userId: string, days: CreateWeeklyProgramInput["days"]) {
  const ids = [...new Set(days.map((d) => d.templateId))];
  const count = await WorkoutTemplateModel.countDocuments({ _id: { $in: ids }, userId });
  if (count !== ids.length) {
    throw AppError.notFound("Workout template not found");
  }
}

async function getOwnedProgram(userId: string, programId: string) {
  const program = await WeeklyProgramModel.findOne({ _id: programId, userId });
  if (!program) {
    throw AppError.notFound("Weekly program not found");
  }
  return program;
}

export function listPresets() {
  return PROGRAM_PRESETS.map((preset) => ({
    key: preset.key,
    name: preset.name,
    description: preset.description,
    daysPerWeek: preset.schedule.length,
    days: preset.schedule.map(({ dayOfWeek, workout }) => ({
      dayOfWeek,
      name: preset.workouts[workout].name,
      exercises: preset.workouts[workout].exercises,
    })),
  }));
}

// Tạo template cho từng buổi khác nhau của lịch đề xuất (buổi lặp lại dùng chung template),
// rồi tạo lịch tuần trỏ tới các template đó
export async function applyPreset(userId: string, key: string) {
  const preset = findPreset(key);
  if (!preset) {
    throw AppError.notFound("Program preset not found");
  }

  const names = [
    ...new Set(Object.values(preset.workouts).flatMap((w) => w.exercises.map((e) => e.name))),
  ];
  const exercises = await ExerciseModel.find({ name: { $in: names }, isCustom: false })
    .select("name")
    .lean();
  const exerciseIds = new Map(exercises.map((e) => [e.name, e._id]));
  const missing = names.filter((n) => !exerciseIds.has(n));
  if (missing.length > 0) {
    // Thư viện bài tập chưa được seed trên server này
    throw new AppError(500, "Exercise library is incomplete", { missingExercises: missing });
  }

  const templateIds = new Map<string, Types.ObjectId>();
  for (const [workoutKey, workout] of Object.entries(preset.workouts)) {
    const template = await WorkoutTemplateModel.create({
      userId,
      name: workout.name,
      exercises: workout.exercises.map((e, order) => ({
        exerciseId: exerciseIds.get(e.name),
        order,
        targetSets: e.sets,
        targetReps: e.reps,
        restSeconds: e.rest,
      })),
    });
    templateIds.set(workoutKey, template._id);
  }

  const program = await WeeklyProgramModel.create({
    userId,
    name: preset.name,
    presetKey: preset.key,
    days: preset.schedule.map(({ dayOfWeek, workout }) => ({
      dayOfWeek,
      templateId: templateIds.get(workout),
    })),
  });
  return serializeOne(program);
}

export async function listPrograms(userId: string) {
  const [timezone, programs] = await Promise.all([
    getUserTimezone(userId),
    WeeklyProgramModel.find({ userId }).sort({ isFavorite: -1, updatedAt: -1 }),
  ]);
  return {
    todayDayOfWeek: dayOfWeek(todayInTimezone(timezone)),
    items: await serialize(programs),
  };
}

export async function getProgram(userId: string, programId: string) {
  return serializeOne(await getOwnedProgram(userId, programId));
}

export async function createProgram(userId: string, input: CreateWeeklyProgramInput) {
  await assertOwnTemplates(userId, input.days);
  const program = await WeeklyProgramModel.create({ userId, ...input });
  return serializeOne(program);
}

export async function updateProgram(
  userId: string,
  programId: string,
  input: UpdateWeeklyProgramInput
) {
  const program = await getOwnedProgram(userId, programId);
  if (input.days) {
    await assertOwnTemplates(userId, input.days);
    program.set("days", input.days);
  }
  if (input.name) program.name = input.name;
  await program.save();
  return serializeOne(program);
}

export async function setFavorite(userId: string, programId: string, isFavorite: boolean) {
  const program = await getOwnedProgram(userId, programId);
  program.isFavorite = isFavorite;
  await program.save();
  return serializeOne(program);
}

// Chỉ xoá lịch, các template vẫn giữ lại để user dùng riêng
export async function deleteProgram(userId: string, programId: string) {
  const program = await getOwnedProgram(userId, programId);
  await program.deleteOne();
}

export async function removeTemplateFromPrograms(userId: string, templateId: string) {
  await WeeklyProgramModel.updateMany({ userId }, { $pull: { days: { templateId } } });
}
