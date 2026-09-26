import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { ExerciseModel } from "../src/models/exercise.model";
import { seedExercises } from "../src/scripts/seedExercises";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

type Auth = Record<string, string>;

let bench: string;
let fly: string;

beforeEach(async () => {
  await seedExercises();
  bench = (await ExerciseModel.findOne({ name: "Bench Press" }))!.id;
  fly = (await ExerciseModel.findOne({ name: "Cable Fly" }))!.id;
});

// Tạo một buổi tập hoàn chỉnh với các set của Bench Press
async function completedWorkout(auth: Auth, sets: [number, number][], name = "Quick") {
  const start = await request(app).post("/api/workout-sessions").set(auth).send({ name });
  const id = start.body.data.id as string;
  for (const [weight, reps] of sets) {
    await request(app).post(`/api/workout-sessions/${id}/sets`).set(auth).send({ exerciseId: bench, weight, reps });
  }
  const done = await request(app).post(`/api/workout-sessions/${id}/complete`).set(auth);
  expect(done.status).toBe(200);
  return id;
}

async function benchRecord(auth: Auth) {
  const res = await request(app).get("/api/personal-records").set(auth);
  return res.body.data.find((r: { exerciseName: string }) => r.exerciseName === "Bench Press");
}

describe("PATCH /api/workout-sessions/:id", () => {
  it("renames and adds notes to active and completed sessions", async () => {
    const { auth } = await createAuthedUser();
    const start = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Quick" });
    const id = start.body.data.id;

    const renamed = await request(app)
      .patch(`/api/workout-sessions/${id}`)
      .set(auth)
      .send({ name: "Ngực nặng", notes: "Vai hơi đau" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data).toMatchObject({ name: "Ngực nặng", notes: "Vai hơi đau" });

    await request(app).post(`/api/workout-sessions/${id}/sets`).set(auth).send({ exerciseId: bench, weight: 60, reps: 8 });
    await request(app).post(`/api/workout-sessions/${id}/complete`).set(auth);
    const later = await request(app).patch(`/api/workout-sessions/${id}`).set(auth).send({ notes: "Ổn" });
    expect(later.body.data.notes).toBe("Ổn");
  });

  it("hides sessions of other users", async () => {
    const owner = await createAuthedUser();
    const other = await createAuthedUser();
    const start = await request(app).post("/api/workout-sessions").set(owner.auth).send({ name: "Quick" });
    const res = await request(app)
      .patch(`/api/workout-sessions/${start.body.data.id}`)
      .set(other.auth)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/workout-sessions/:id", () => {
  it("refuses to delete an in-progress session", async () => {
    const { auth } = await createAuthedUser();
    const start = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Quick" });
    const res = await request(app).delete(`/api/workout-sessions/${start.body.data.id}`).set(auth);
    expect(res.status).toBe(409);
  });

  it("rebuilds personal records from the remaining sessions", async () => {
    const { auth } = await createAuthedUser();
    const first = await completedWorkout(auth, [[60, 8]], "Buổi 1");
    const second = await completedWorkout(auth, [[80, 5]], "Buổi 2");
    expect((await benchRecord(auth)).maxWeight).toBe(80);

    expect((await request(app).delete(`/api/workout-sessions/${second}`).set(auth)).status).toBe(204);
    const rebuilt = await benchRecord(auth);
    expect(rebuilt).toMatchObject({ maxWeight: 60, maxReps: 8, sessionId: first });

    await request(app).delete(`/api/workout-sessions/${first}`).set(auth);
    expect(await benchRecord(auth)).toBeUndefined();
  });
});

describe("GET /api/exercises/:id/history", () => {
  it("lists completed sessions with the best set, newest first", async () => {
    const { auth } = await createAuthedUser();
    await completedWorkout(auth, [[60, 8], [65, 6]]);
    await completedWorkout(auth, [[70, 5]]);

    const res = await request(app).get(`/api/exercises/${bench}/history`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.exercise.name).toBe("Bench Press");
    expect(res.body.data.record.maxWeight).toBe(70);
    expect(res.body.data.entries).toHaveLength(2);
    expect(res.body.data.entries[0].best.maxWeight).toBe(70);
    expect(res.body.data.entries[1]).toMatchObject({ volume: 60 * 8 + 65 * 6, best: { maxWeight: 65, maxReps: 8 } });
  });

  it("returns an empty history for an exercise never trained", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get(`/api/exercises/${fly}/history`).set(auth);
    expect(res.body.data).toMatchObject({ record: null, entries: [] });
  });
});

describe("custom exercise update / delete", () => {
  async function customExercise(auth: Auth) {
    const res = await request(app)
      .post("/api/exercises")
      .set(auth)
      .send({ name: "Landmine Press", muscleGroup: "SHOULDERS", equipment: "BARBELL" });
    return res.body.data.id as string;
  }

  it("updates the owner's exercise but not system ones", async () => {
    const { auth } = await createAuthedUser();
    const id = await customExercise(auth);

    const updated = await request(app).put(`/api/exercises/${id}`).set(auth).send({ name: "Landmine" });
    expect(updated.body.data.name).toBe("Landmine");

    const system = await request(app).put(`/api/exercises/${bench}`).set(auth).send({ name: "X" });
    expect(system.status).toBe(403);
  });

  it("blocks deleting an exercise still used by a template", async () => {
    const { auth } = await createAuthedUser();
    const id = await customExercise(auth);
    const template = await request(app)
      .post("/api/workout-templates")
      .set(auth)
      .send({ name: "Vai", exercises: [{ exerciseId: id, targetSets: 3, targetReps: 10 }] });

    const blocked = await request(app).delete(`/api/exercises/${id}`).set(auth);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toContain("Vai");

    await request(app).delete(`/api/workout-templates/${template.body.data.id}`).set(auth);
    expect((await request(app).delete(`/api/exercises/${id}`).set(auth)).status).toBe(204);
  });
});

describe("POST /api/workout-templates/:id/duplicate", () => {
  it("copies the exercises under a new name", async () => {
    const { auth } = await createAuthedUser();
    const template = await request(app)
      .post("/api/workout-templates")
      .set(auth)
      .send({
        name: "Push",
        exercises: [
          { exerciseId: bench, targetSets: 4, targetReps: 6 },
          { exerciseId: fly, targetSets: 3, targetReps: 12, restSeconds: 60 },
        ],
      });

    const res = await request(app).post(`/api/workout-templates/${template.body.data.id}/duplicate`).set(auth);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Push (bản sao)");
    expect(res.body.data.id).not.toBe(template.body.data.id);
    expect(res.body.data.exercises).toHaveLength(2);
    expect(res.body.data.exercises[1]).toMatchObject({ targetSets: 3, targetReps: 12, restSeconds: 60 });
  });
});
