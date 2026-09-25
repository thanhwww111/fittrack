import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { ExerciseModel } from "../src/models/exercise.model";
import { PersonalRecordModel } from "../src/models/personalRecord.model";
import { WorkoutSessionModel } from "../src/models/workoutSession.model";
import { seedExercises } from "../src/scripts/seedExercises";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

let bench: string;
let incline: string;
let fly: string;
let pullUp: string;

beforeEach(async () => {
  await seedExercises();
  const id = async (name: string) => (await ExerciseModel.findOne({ name }))!.id as string;
  bench = await id("Bench Press");
  incline = await id("Incline Dumbbell Press");
  fly = await id("Cable Fly");
  pullUp = await id("Pull-up");
});

type Auth = Record<string, string>;

function pushDay() {
  return {
    name: "Push Day",
    exercises: [
      { exerciseId: bench, targetSets: 3, targetReps: 8 },
      { exerciseId: incline, targetSets: 3, targetReps: 10 },
      { exerciseId: fly, targetSets: 3, targetReps: 12, restSeconds: 60 },
    ],
  };
}

async function startFreeWorkout(auth: Auth) {
  const res = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Quick" });
  return res.body.data.id as string;
}

function addSet(auth: Auth, sessionId: string, body: object) {
  return request(app).post(`/api/workout-sessions/${sessionId}/sets`).set(auth).send(body);
}

describe("exercises", () => {
  it("filters by muscle group", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/exercises?muscleGroup=CHEST").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(4);
    expect(res.body.data.every((e: { muscleGroup: string }) => e.muscleGroup === "CHEST")).toBe(true);
  });

  it("creates custom exercises visible only to the owner", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const created = await request(app)
      .post("/api/exercises")
      .set(alice.auth)
      .send({ name: "Landmine Press", muscleGroup: "SHOULDERS", equipment: "BARBELL" });

    expect(created.status).toBe(201);
    const bobView = await request(app).get(`/api/exercises/${created.body.data.id}`).set(bob.auth);
    expect(bobView.status).toBe(404);
  });

  it("rejects an unknown muscle group", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/exercises?muscleGroup=NECK").set(auth);
    expect(res.status).toBe(400);
  });
});

describe("workout templates", () => {
  it("creates a template and assigns order from array position", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).post("/api/workout-templates").set(auth).send(pushDay());

    expect(res.status).toBe(201);
    expect(res.body.data.exercises.map((e: { order: number }) => e.order)).toEqual([0, 1, 2]);
    expect(res.body.data.exercises[0].restSeconds).toBe(90);
  });

  it("rejects exercises that do not exist or belong to someone else", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const secret = await request(app)
      .post("/api/exercises")
      .set(alice.auth)
      .send({ name: "Secret Move", muscleGroup: "CORE", equipment: "OTHER" });

    const res = await request(app)
      .post("/api/workout-templates")
      .set(bob.auth)
      .send({
        name: "Stolen",
        exercises: [{ exerciseId: secret.body.data.id, targetSets: 3, targetReps: 8 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.missingExerciseIds).toEqual([secret.body.data.id]);
  });

  it("rejects an empty template", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/workout-templates")
      .set(auth)
      .send({ name: "Empty", exercises: [] });
    expect(res.status).toBe(400);
  });

  it("updates, lists and deletes own templates only", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const created = await request(app).post("/api/workout-templates").set(alice.auth).send(pushDay());
    const id = created.body.data.id;

    const bobPut = await request(app).put(`/api/workout-templates/${id}`).set(bob.auth).send({ name: "x" });
    expect(bobPut.status).toBe(404);

    const renamed = await request(app)
      .put(`/api/workout-templates/${id}`)
      .set(alice.auth)
      .send({ name: "Push A" });
    expect(renamed.body.data.name).toBe("Push A");

    const detail = await request(app).get(`/api/workout-templates/${id}`).set(alice.auth);
    expect(detail.body.data.exercises[0].exerciseId.name).toBe("Bench Press");

    const list = await request(app).get("/api/workout-templates").set(bob.auth);
    expect(list.body.data).toHaveLength(0);

    const del = await request(app).delete(`/api/workout-templates/${id}`).set(alice.auth);
    expect(del.status).toBe(204);
  });
});

describe("starting a workout", () => {
  it("copies exercises and targets from a template", async () => {
    const { auth } = await createAuthedUser();
    const template = await request(app).post("/api/workout-templates").set(auth).send(pushDay());

    const res = await request(app)
      .post("/api/workout-sessions")
      .set(auth)
      .send({ templateId: template.body.data.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: "Push Day", status: "IN_PROGRESS", totalVolume: 0 });
    expect(res.body.data.exercises.map((e: { exerciseName: string }) => e.exerciseName)).toEqual([
      "Bench Press",
      "Incline Dumbbell Press",
      "Cable Fly",
    ]);
    // Bench Press dùng mặc định 90s, Cable Fly đặt 60s trong template
    expect(res.body.data.exercises.map((e: { restSeconds: number }) => e.restSeconds)).toEqual([90, 90, 60]);
  });

  it("allows only one workout in progress", async () => {
    const { auth } = await createAuthedUser();
    const first = await startFreeWorkout(auth);

    const second = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Again" });
    expect(second.status).toBe(409);
    expect(second.body.error.details.activeSessionId).toBe(first);

    const active = await request(app).get("/api/workout-sessions/active").set(auth);
    expect(active.body.data.id).toBe(first);
  });

  it("cannot start from another user's template", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const template = await request(app).post("/api/workout-templates").set(alice.auth).send(pushDay());

    const res = await request(app)
      .post("/api/workout-sessions")
      .set(bob.auth)
      .send({ templateId: template.body.data.id });
    expect(res.status).toBe(404);
  });
});

describe("recording sets", () => {
  it("appends sets, updates volume and flags a first-time PR", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);

    const first = await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });
    expect(first.status).toBe(201);
    expect(first.body.data.set).toMatchObject({ setNumber: 1, weight: 60, reps: 8 });
    expect(first.body.data.prCheck.isNewRecord).toBe(true);

    const second = await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 7 });
    expect(second.body.data.set.setNumber).toBe(2);
    expect(second.body.data.session.totalVolume).toBe(900);
    expect(second.body.data.session.exercises[0].exerciseName).toBe("Bench Press");
  });

  it("edits an existing set when setNumber is given", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);
    await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });

    const res = await addSet(auth, sessionId, { exerciseId: bench, setNumber: 1, weight: 65, reps: 6 });
    expect(res.body.data.session.exercises[0].sets).toEqual([
      { setNumber: 1, weight: 65, reps: 6, completed: true },
    ]);
    expect(res.body.data.session.totalVolume).toBe(390);
  });

  it("rejects negative weight, zero reps and gaps in setNumber", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);

    const negative = await addSet(auth, sessionId, { exerciseId: bench, weight: -20, reps: 8 });
    const zeroReps = await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 0 });
    const gap = await addSet(auth, sessionId, { exerciseId: bench, setNumber: 3, weight: 60, reps: 8 });

    expect(negative.status).toBe(400);
    expect(zeroReps.status).toBe(400);
    expect(gap.status).toBe(400);
  });

  it("removes a set and renumbers the rest", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);
    for (const weight of [50, 55, 60]) {
      await addSet(auth, sessionId, { exerciseId: bench, weight, reps: 5 });
    }

    const res = await request(app)
      .delete(`/api/workout-sessions/${sessionId}/exercises/${bench}/sets/2`)
      .set(auth);

    expect(res.status).toBe(200);
    const sets = res.body.data.exercises[0].sets;
    expect(sets.map((s: { setNumber: number; weight: number }) => [s.setNumber, s.weight])).toEqual([
      [1, 50],
      [2, 60],
    ]);
    expect(res.body.data.totalVolume).toBe(550);
  });

  it("cannot add sets to another user's workout", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const sessionId = await startFreeWorkout(alice.auth);

    const res = await addSet(bob.auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });
    expect(res.status).toBe(404);
  });
});

describe("completing a workout", () => {
  it("computes duration and volume, drops untouched exercises and saves PRs", async () => {
    const { auth, userId } = await createAuthedUser();
    const template = await request(app).post("/api/workout-templates").set(auth).send(pushDay());
    const start = await request(app)
      .post("/api/workout-sessions")
      .set(auth)
      .send({ templateId: template.body.data.id });
    const sessionId = start.body.data.id;

    // Giả lập buổi tập bắt đầu 45 phút trước
    await WorkoutSessionModel.updateOne(
      { _id: sessionId },
      { startedAt: new Date(Date.now() - 45 * 60 * 1000) }
    );

    await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });
    await addSet(auth, sessionId, { exerciseId: bench, weight: 62.5, reps: 6 });
    await addSet(auth, sessionId, { exerciseId: incline, weight: 20, reps: 10 });

    const res = await request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(auth);

    expect(res.status).toBe(200);
    const session = res.body.data.session;
    expect(session.status).toBe("COMPLETED");
    expect(session.totalVolume).toBe(1055);
    expect(session.duration).toBeGreaterThanOrEqual(45 * 60);
    expect(session.duration).toBeLessThan(46 * 60);
    expect(session.exercises).toHaveLength(2); // Cable Fly không tập nên bị bỏ

    expect(res.body.data.newRecords).toHaveLength(2);
    const benchPR = await PersonalRecordModel.findOne({ userId, exerciseId: bench });
    expect(benchPR).toMatchObject({ maxWeight: 62.5, maxReps: 8, estimatedOneRepMax: 76 });
  });

  it("cannot complete an already completed workout", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);
    await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });

    const first = await request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(auth);
    const second = await request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(auth);
    const addAfter = await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(addAfter.status).toBe(409);
  });

  it("only one of two simultaneous complete requests succeeds", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);
    await addSet(auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });

    const results = await Promise.all([
      request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(auth),
      request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(auth),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("cannot complete a workout without sets", async () => {
    const { auth } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);
    const res = await request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(auth);
    expect(res.status).toBe(400);
  });

  it("only reports metrics that beat the previous record", async () => {
    const { auth } = await createAuthedUser();

    const s1 = await startFreeWorkout(auth);
    await addSet(auth, s1, { exerciseId: bench, weight: 60, reps: 8 });
    await request(app).post(`/api/workout-sessions/${s1}/complete`).set(auth);

    const s2 = await startFreeWorkout(auth);
    const set = await addSet(auth, s2, { exerciseId: bench, weight: 62.5, reps: 5 });
    expect(set.body.data.prCheck).toEqual({ isNewRecord: true, improved: ["maxWeight"] });
    await addSet(auth, s2, { exerciseId: pullUp, weight: 0, reps: 10 });
    const res = await request(app).post(`/api/workout-sessions/${s2}/complete`).set(auth);

    const records = res.body.data.newRecords;
    expect(records.find((r: { exerciseId: string }) => r.exerciseId === bench).improved).toEqual([
      "maxWeight",
    ]);
    expect(records.find((r: { exerciseId: string }) => r.exerciseId === pullUp).improved).toEqual([
      "maxReps",
    ]);

    const list = await request(app).get("/api/personal-records").set(auth);
    expect(list.body.data).toHaveLength(2);
  });

  it("cannot complete another user's workout", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const sessionId = await startFreeWorkout(alice.auth);
    await addSet(alice.auth, sessionId, { exerciseId: bench, weight: 60, reps: 8 });

    const res = await request(app).post(`/api/workout-sessions/${sessionId}/complete`).set(bob.auth);
    expect(res.status).toBe(404);
  });
});

describe("cancel and history", () => {
  it("cancels a workout, frees the slot and keeps it out of PRs", async () => {
    const { auth, userId } = await createAuthedUser();
    const sessionId = await startFreeWorkout(auth);
    await addSet(auth, sessionId, { exerciseId: bench, weight: 200, reps: 1 });

    const cancel = await request(app).post(`/api/workout-sessions/${sessionId}/cancel`).set(auth);
    expect(cancel.body.data.status).toBe("CANCELLED");
    expect(await PersonalRecordModel.countDocuments({ userId })).toBe(0);

    const next = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Retry" });
    expect(next.status).toBe(201);
  });

  it("lists own sessions newest first, filterable by status", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();

    const s1 = await startFreeWorkout(alice.auth);
    await addSet(alice.auth, s1, { exerciseId: bench, weight: 60, reps: 8 });
    await request(app).post(`/api/workout-sessions/${s1}/complete`).set(alice.auth);
    await startFreeWorkout(alice.auth);
    await startFreeWorkout(bob.auth);

    const all = await request(app).get("/api/workout-sessions").set(alice.auth);
    const completed = await request(app)
      .get("/api/workout-sessions?status=COMPLETED")
      .set(alice.auth);

    expect(all.body.data.total).toBe(2);
    expect(all.body.data.items[0].status).toBe("IN_PROGRESS");
    expect(completed.body.data.items.map((s: { id: string }) => s.id)).toEqual([s1]);
  });
});

describe("GET /api/workout-sessions/today", () => {
  it("returns the active session and today's completed sessions only", async () => {
    const { auth, userId } = await createAuthedUser();
    const other = await createAuthedUser();

    // Buổi hoàn thành hôm qua: không tính
    const yesterday = new Date(Date.now() - 36 * 60 * 60 * 1000);
    await WorkoutSessionModel.create({
      userId,
      name: "Old",
      status: "COMPLETED",
      startedAt: yesterday,
      completedAt: yesterday,
    });

    const done = await startFreeWorkout(auth);
    await addSet(auth, done, { exerciseId: bench, weight: 60, reps: 8 });
    await request(app).post(`/api/workout-sessions/${done}/complete`).set(auth);
    const active = await startFreeWorkout(auth);
    await startFreeWorkout(other.auth);

    const res = await request(app).get("/api/workout-sessions/today").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.active.id).toBe(active);
    expect(res.body.data.completed.map((s: { id: string }) => s.id)).toEqual([done]);
  });

  it("is empty for a new user", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/workout-sessions/today").set(auth);
    expect(res.body.data).toMatchObject({ active: null, completed: [] });
  });
});
