import { PersonalRecordModel } from "../models/personalRecord.model";
import {
  WorkoutSessionModel,
  type WorkoutSessionDocument,
} from "../models/workoutSession.model";
import type {
  ListSessionsQuery,
  RecordSetInput,
  StartSessionInput,
} from "../schemas/workout.schema";
import { AppError } from "../utils/AppError";
import { calculateVolume, detectPR, type RecordValues } from "../utils/workoutMath";
import { getVisibleExercise, getVisibleExercisesByIds } from "./exercise.service";
import { getOwnedTemplate } from "./workoutTemplate.service";


function allSets(session: WorkoutSessionDocument) {
  return session.exercises.flatMap((e) => e.sets);
}

async function getOwnedSession(userId: string, sessionId: string) {
  const session = await WorkoutSessionModel.findOne({ _id: sessionId, userId });
  if (!session) {
    throw AppError.notFound("Workout session not found");
  }
  return session;
}

function assertInProgress(session: WorkoutSessionDocument) {
  if (session.status === "COMPLETED") {
    throw AppError.conflict("Workout is already completed");
  }
  if (session.status === "CANCELLED") {
    throw AppError.conflict("Workout has been cancelled");
  }
}

async function getRecord(userId: string, exerciseId: string): Promise<RecordValues | null> {
  return PersonalRecordModel.findOne({ userId, exerciseId })
    .select("maxWeight maxReps estimatedOneRepMax")
    .lean();
}

export async function startSession(userId: string, input: StartSessionInput) {
  const active = await WorkoutSessionModel.exists({ userId, status: "IN_PROGRESS" });
  if (active) {
    throw new AppError(409, "Another workout is already in progress", {
      activeSessionId: String(active._id),
    });
  }

  let name = input.name;
  let exercises: {
    exerciseId: unknown;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    sets: [];
  }[] = [];

  if (input.templateId) {
    const template = await getOwnedTemplate(userId, input.templateId);
    const ordered = [...template.exercises].sort((a, b) => a.order - b.order);
    const byId = await getVisibleExercisesByIds(
      userId,
      ordered.map((e) => String(e.exerciseId))
    );

    name ??= template.name;
    exercises = ordered.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: byId.get(String(e.exerciseId))!.name,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      sets: [],
    }));
  }

  try {
    const session = await WorkoutSessionModel.create({
      userId,
      templateId: input.templateId ?? null,
      name,
      exercises,
    });
    return session.toJSON();
  } catch (err) {
    // Unique index one_active_session_per_user chặn trường hợp 2 request start cùng lúc
    if ((err as { code?: number }).code === 11000) {
      throw AppError.conflict("Another workout is already in progress");
    }
    throw err;
  }
}

export async function listSessions(userId: string, query: ListSessionsQuery) {
  const filter = { userId, ...(query.status && { status: query.status }) };
  const [items, total] = await Promise.all([
    WorkoutSessionModel.find(filter)
      .sort({ startedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    WorkoutSessionModel.countDocuments(filter),
  ]);
  return { items: items.map((s) => s.toJSON()), page: query.page, limit: query.limit, total };
}

export async function getActiveSession(userId: string) {
  const session = await WorkoutSessionModel.findOne({ userId, status: "IN_PROGRESS" });
  return session?.toJSON() ?? null;
}

export async function getSession(userId: string, sessionId: string) {
  return (await getOwnedSession(userId, sessionId)).toJSON();
}

export async function recordSet(userId: string, sessionId: string, input: RecordSetInput) {
  const session = await getOwnedSession(userId, sessionId);
  assertInProgress(session);

  let entry = session.exercises.find((e) => String(e.exerciseId) === input.exerciseId);
  if (!entry) {
    const exercise = await getVisibleExercise(userId, input.exerciseId);
    session.exercises.push({ exerciseId: exercise._id, exerciseName: exercise.name, sets: [] });
    entry = session.exercises[session.exercises.length - 1];
  }

  const nextNumber = entry.sets.length + 1;
  const setNumber = input.setNumber ?? nextNumber;
  if (setNumber > nextNumber) {
    throw AppError.badRequest(`setNumber must be between 1 and ${nextNumber}`);
  }

  const set = { setNumber, weight: input.weight, reps: input.reps, completed: true };
  if (setNumber === nextNumber) {
    entry.sets.push(set);
  } else {
    entry.sets[setNumber - 1].set(set);
  }

  session.totalVolume = calculateVolume(allSets(session));
  await session.save();

  // Báo ngay cho client nếu set này phá PR (PR chính thức chỉ lưu khi complete)
  const pr = detectPR(await getRecord(userId, input.exerciseId), [set]);

  return {
    session: session.toJSON(),
    set,
    prCheck: { isNewRecord: pr.isNewRecord, improved: pr.improved },
  };
}

export async function removeSet(
  userId: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number
) {
  const session = await getOwnedSession(userId, sessionId);
  assertInProgress(session);

  const entry = session.exercises.find((e) => String(e.exerciseId) === exerciseId);
  const index = entry ? entry.sets.findIndex((s) => s.setNumber === setNumber) : -1;
  if (!entry || index === -1) {
    throw AppError.notFound("Set not found");
  }

  entry.sets.splice(index, 1);
  // Đánh số lại để setNumber luôn liên tục 1..n
  entry.sets.forEach((s, i) => {
    s.setNumber = i + 1;
  });

  session.totalVolume = calculateVolume(allSets(session));
  await session.save();
  return session.toJSON();
}

export async function completeSession(userId: string, sessionId: string) {
  const session = await getOwnedSession(userId, sessionId);
  assertInProgress(session);

  // Bỏ các bài trong template mà user không tập set nào
  const performed = session.exercises.filter((e) => e.sets.some((s) => s.completed !== false));
  if (performed.length === 0) {
    throw AppError.badRequest("Cannot complete a workout without any completed sets");
  }

  const completedAt = new Date();
  const exercises = performed.map((e) => e.toObject());

  // Chỉ chuyển trạng thái nếu vẫn đang IN_PROGRESS: 2 request complete cùng lúc
  // thì chỉ một request thắng, không bị tính PR hai lần
  const completed = await WorkoutSessionModel.findOneAndUpdate(
    { _id: session._id, userId, status: "IN_PROGRESS" },
    {
      $set: {
        exercises,
        completedAt,
        duration: Math.max(
          0,
          Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000)
        ),
        totalVolume: calculateVolume(exercises.flatMap((e) => e.sets)),
        status: "COMPLETED",
      },
    },
    { new: true, runValidators: true }
  );
  if (!completed) {
    throw AppError.conflict("Workout is already completed");
  }

  const newRecords = [];
  for (const entry of completed.exercises) {
    const exerciseId = String(entry.exerciseId);
    const result = detectPR(await getRecord(userId, exerciseId), entry.sets);
    if (!result.isNewRecord) continue;

    await PersonalRecordModel.updateOne(
      { userId, exerciseId },
      {
        $set: {
          ...result.record,
          exerciseName: entry.exerciseName,
          sessionId: completed._id,
          achievedAt: completedAt,
        },
      },
      { upsert: true }
    );
    newRecords.push({
      exerciseId,
      exerciseName: entry.exerciseName,
      improved: result.improved,
      record: result.record,
    });
  }

  return { session: completed.toJSON(), newRecords };
}

export async function cancelSession(userId: string, sessionId: string) {
  const session = await getOwnedSession(userId, sessionId);
  assertInProgress(session);

  const cancelled = await WorkoutSessionModel.findOneAndUpdate(
    { _id: session._id, userId, status: "IN_PROGRESS" },
    { $set: { status: "CANCELLED" } },
    { new: true }
  );
  if (!cancelled) {
    throw AppError.conflict("Workout is no longer in progress");
  }
  return cancelled.toJSON();
}

export async function listPersonalRecords(userId: string) {
  const records = await PersonalRecordModel.find({ userId }).sort({ exerciseName: 1 });
  return records.map((r) => r.toJSON());
}
