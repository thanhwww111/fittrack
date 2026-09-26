import { PersonalRecordModel } from "../models/personalRecord.model";
import {
  WorkoutSessionModel,
  type WorkoutSessionDocument,
} from "../models/workoutSession.model";
import type {
  ListSessionsQuery,
  RecordSetInput,
  StartSessionInput,
  UpdateSessionInput,
} from "../schemas/workout.schema";
import { AppError } from "../utils/AppError";
import { addDays, todayInTimezone } from "../utils/date";
import { bestOfSets, calculateVolume, detectPR, type RecordValues } from "../utils/workoutMath";
import { getVisibleExercise, getVisibleExercisesByIds } from "./exercise.service";
import { notifyNewRecords } from "./notification.service";
import { getUserTimezone } from "./profile.service";
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
    restSeconds: number;
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
      restSeconds: e.restSeconds,
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

// Cho Dashboard: buổi đang tập (nếu có) + các buổi đã hoàn thành trong hôm nay của user
export async function getTodayWorkout(userId: string) {
  const timezone = await getUserTimezone(userId);
  const today = todayInTimezone(timezone);

  const [active, recent] = await Promise.all([
    WorkoutSessionModel.findOne({ userId, status: "IN_PROGRESS" }),
    // Lùi 1 ngày UTC để không sót múi giờ đi trước UTC, rồi lọc lại theo ngày địa phương
    WorkoutSessionModel.find({
      userId,
      status: "COMPLETED",
      completedAt: { $gte: new Date(`${addDays(today, -1)}T00:00:00Z`) },
    }).sort({ completedAt: -1 }),
  ]);

  const completed = recent.filter((s) => todayInTimezone(timezone, s.completedAt!) === today);
  return {
    date: today,
    active: active?.toJSON() ?? null,
    completed: completed.map((s) => s.toJSON()),
  };
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
    { returnDocument: "after", runValidators: true }
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

  // Không chờ gửi push: user nhận response ngay, lỗi push không ảnh hưởng việc lưu buổi tập
  void notifyNewRecords(userId, completed.id, newRecords);

  return { session: completed.toJSON(), newRecords };
}

export async function cancelSession(userId: string, sessionId: string) {
  const session = await getOwnedSession(userId, sessionId);
  assertInProgress(session);

  const cancelled = await WorkoutSessionModel.findOneAndUpdate(
    { _id: session._id, userId, status: "IN_PROGRESS" },
    { $set: { status: "CANCELLED" } },
    { returnDocument: "after" }
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

export async function updateSession(userId: string, sessionId: string, input: UpdateSessionInput) {
  const session = await getOwnedSession(userId, sessionId);
  if (session.status === "CANCELLED") {
    throw AppError.conflict("Workout has been cancelled");
  }
  session.set(input);
  await session.save();
  return session.toJSON();
}

// Tính lại PR của một bài tập bằng cách duyệt lại các buổi đã hoàn thành theo thứ tự thời gian.
// Không còn buổi nào có bài đó thì xoá PR.
async function rebuildRecord(userId: string, exerciseId: string) {
  const sessions = await WorkoutSessionModel.find({
    userId,
    status: "COMPLETED",
    "exercises.exerciseId": exerciseId,
  })
    .sort({ completedAt: 1 })
    .lean();

  let record: RecordValues | null = null;
  let achieved: { sessionId: unknown; at: Date; name: string } | null = null;
  for (const s of sessions) {
    const entry = s.exercises.find((e) => String(e.exerciseId) === exerciseId);
    if (!entry) continue;
    const result = detectPR(record, entry.sets);
    if (result.isNewRecord) {
      record = result.record;
      achieved = { sessionId: s._id, at: s.completedAt ?? s.startedAt, name: entry.exerciseName };
    }
  }

  if (!record || !achieved) {
    await PersonalRecordModel.deleteOne({ userId, exerciseId });
    return;
  }
  await PersonalRecordModel.updateOne(
    { userId, exerciseId },
    {
      $set: {
        ...record,
        exerciseName: achieved.name,
        sessionId: achieved.sessionId,
        achievedAt: achieved.at,
      },
    },
    { upsert: true }
  );
}

// Buổi đang tập thì dùng cancel. Xoá buổi đã hoàn thành sẽ tính lại PR của các bài trong buổi đó.
export async function deleteSession(userId: string, sessionId: string) {
  const session = await getOwnedSession(userId, sessionId);
  if (session.status === "IN_PROGRESS") {
    throw AppError.conflict("Cancel the workout instead of deleting it while in progress");
  }
  const exerciseIds = [...new Set(session.exercises.map((e) => String(e.exerciseId)))];
  const wasCompleted = session.status === "COMPLETED";
  await session.deleteOne();

  if (wasCompleted) {
    for (const exerciseId of exerciseIds) await rebuildRecord(userId, exerciseId);
  }
}

// Lịch sử một bài tập qua các buổi đã hoàn thành (mới nhất trước), dùng cho biểu đồ tiến bộ
export async function getExerciseHistory(userId: string, exerciseId: string, limit: number) {
  const exercise = await getVisibleExercise(userId, exerciseId);
  const [sessions, record] = await Promise.all([
    WorkoutSessionModel.find({
      userId,
      status: "COMPLETED",
      "exercises.exerciseId": exercise._id,
    })
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean(),
    PersonalRecordModel.findOne({ userId, exerciseId: exercise._id }).lean(),
  ]);

  const entries = sessions.flatMap((s) => {
    const entry = s.exercises.find((e) => String(e.exerciseId) === exercise.id);
    if (!entry) return [];
    return [
      {
        sessionId: String(s._id),
        sessionName: s.name,
        date: (s.completedAt ?? s.startedAt).toISOString(),
        sets: entry.sets.map(({ setNumber, weight, reps }) => ({ setNumber, weight, reps })),
        volume: calculateVolume(entry.sets),
        best: bestOfSets(entry.sets),
      },
    ];
  });

  return {
    exercise: exercise.toJSON(),
    record: record
      ? {
          maxWeight: record.maxWeight,
          maxReps: record.maxReps,
          estimatedOneRepMax: record.estimatedOneRepMax,
          achievedAt: record.achievedAt,
        }
      : null,
    entries,
  };
}
