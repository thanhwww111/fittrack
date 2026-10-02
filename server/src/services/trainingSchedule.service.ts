import { Types } from "mongoose";
import { TrainingScheduleModel, type ScheduleSnapshot } from "../models/trainingSchedule.model";
import { WeeklyProgramModel } from "../models/weeklyProgram.model";
import { WorkoutTemplateModel } from "../models/workoutTemplate.model";
import { WorkoutSessionModel } from "../models/workoutSession.model";
import { AppError } from "../utils/AppError";
import { addDays, dateRange, daysBetween, todayInTimezone } from "../utils/date";
import { getUserTimezone } from "./profile.service";
import { getVisibleExercisesByIds } from "./exercise.service";
import { expireScheduledSessions } from "./scheduledSession.service";

function versionOn(versions: ScheduleSnapshot[], date: string) {
  return versions.filter(v => v.effectiveFrom <= date).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).at(-1) ?? null;
}
export async function getTrainingSchedule(userId: string, query: { from?: string; to?: string } = {}) {
  await expireScheduledSessions(userId);
  const timezone = await getUserTimezone(userId);
  const today = todayInTimezone(timezone);
  const from = query.from ?? addDays(today, -1);
  const to = query.to ?? addDays(today, 27);
  if (from > to || daysBetween(from, to) > 365) throw AppError.badRequest("Date range must contain 1 to 366 days");
  const [state, sessions] = await Promise.all([
    TrainingScheduleModel.findOne({ userId }).lean(),
    WorkoutSessionModel.find({ userId, scheduledDate: { $gte: from, $lte: to } }).lean(),
  ]);
  const versions = state?.versions ?? [];
  const current = versionOn(versions, today);
  const pending = versions.filter(v => v.effectiveFrom > today).at(-1) ?? null;
  const days = dateRange(from, to).map(date => {
    const snapshot = versionOn(versions, date);
    const day = snapshot?.days.find(d => d.dayOfWeek === (new Date(`${date}T00:00:00Z`).getUTCDay() || 7));
    const session = sessions.find(s => s.scheduledDate === date);
    const localToday = todayInTimezone(snapshot?.timezone ?? timezone);
    const status = !snapshot ? "NO_PLAN" : !day ? "REST" : session?.status === "COMPLETED" ? "COMPLETED"
      : date < localToday || session?.status === "CANCELLED" ? "MISSED" : session?.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PLANNED";
    return { date, timezone: snapshot?.timezone ?? timezone, status,
      workout: day ? { templateId: day.templateId, templateName: day.templateName, exerciseCount: day.exerciseCount } : null,
      sessionId: session ? String(session._id) : null };
  });
  return { today, timezone, current, pending, days };
}

export async function applyTrainingSchedule(userId: string, input: { programId: string; requestId: string }) {
  // Create once, then serialize competing activations with revision compare-and-swap.
  try { await TrainingScheduleModel.updateOne({ userId }, { $setOnInsert: { userId, revision: 0, versions: [], requests: [] } }, { upsert: true }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  for (let attempt = 0; attempt < 20; attempt++) {
    const state = (await TrainingScheduleModel.findOne({ userId }).lean())!;
    const previous = state.requests.find(r => r.requestId === input.requestId);
    if (previous) {
      if (previous.programId !== input.programId) throw AppError.conflict("requestId has already been used for a different program");
      return getTrainingSchedule(userId);
    }
    const program = await WeeklyProgramModel.findOne({ _id: input.programId, userId });
    if (!program) throw AppError.notFound("Weekly program not found");
    if (!program.days.length) throw AppError.badRequest("Choose at least one workout day");
    const timezone = await getUserTimezone(userId);
    const today = todayInTimezone(timezone);
    const templates = await WorkoutTemplateModel.find({ userId, _id: { $in: program.days.map(d => d.templateId) } });
    const exercises = await getVisibleExercisesByIds(userId, templates.flatMap(t => t.exercises.map(e => String(e.exerciseId))));
    const snapshot: ScheduleSnapshot = {
      id: new Types.ObjectId().toString(), programId: program.id, name: program.name, timezone,
      effectiveFrom: state.versions.length ? addDays(today, 1) : today,
      days: [...program.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(day => {
        const template = templates.find(t => t.id === String(day.templateId));
        if (!template) throw AppError.notFound("Workout template not found");
        return { dayOfWeek: day.dayOfWeek, templateId: template.id, templateName: template.name,
          exerciseCount: template.exercises.length,
          exercises: [...template.exercises].sort((a,b) => a.order-b.order).map(e => ({
            exerciseId: String(e.exerciseId), exerciseName: exercises.get(String(e.exerciseId))!.name,
            order: e.order, targetSets: e.targetSets, targetReps: e.targetReps, restSeconds: e.restSeconds,
          })) };
      }),
    };
    const result = await TrainingScheduleModel.updateOne({ _id: state._id, revision: state.revision }, {
      $push: { versions: snapshot, requests: input }, $inc: { revision: 1 },
    });
    if (result.modifiedCount) return getTrainingSchedule(userId);
  }
  throw AppError.conflict("Schedule changed concurrently; retry with the same requestId");
}

export async function startScheduledSession(userId: string) {
  const schedule = await getTrainingSchedule(userId);
  const snapshot = schedule.current;
  const day = snapshot?.days.find(d => d.dayOfWeek === (new Date(`${schedule.today}T00:00:00Z`).getUTCDay() || 7));
  if (!snapshot || !day) throw AppError.conflict("There is no scheduled workout today");
  const existing = await WorkoutSessionModel.findOne({ userId, scheduledDate: schedule.today });
  if (existing) return existing.toJSON();
  try {
    return (await WorkoutSessionModel.create({ userId, name: day.templateName, templateId: day.templateId,
      scheduledDate: schedule.today, scheduleVersionId: snapshot.id, scheduleTimezone: snapshot.timezone,
      exercises: day.exercises.map(e => ({ ...e, sets: [] })),
    })).toJSON();
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const winner = await WorkoutSessionModel.findOne({ userId, scheduledDate: schedule.today });
    if (winner) return winner.toJSON();
    throw AppError.conflict("Another workout is already in progress");
  }
}
