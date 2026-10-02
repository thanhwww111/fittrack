import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { ExerciseModel } from "../src/models/exercise.model";
import { WorkoutTemplateModel } from "../src/models/workoutTemplate.model";
import { WeeklyProgramModel } from "../src/models/weeklyProgram.model";
import { WorkoutSessionModel } from "../src/models/workoutSession.model";
import { addDays, todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();
async function fixture() {
  const user = await createAuthedUser();
  const exercise = await ExerciseModel.create({ name: "Bench", muscleGroup: "CHEST", equipment: "BARBELL" });
  const template = await WorkoutTemplateModel.create({ userId: user.userId, name: "Upper", exercises: [{ exerciseId: exercise.id, order: 0, targetSets: 3, targetReps: 8, restSeconds: 90 }] });
  const program = await WeeklyProgramModel.create({ userId: user.userId, name: "Week", days: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, templateId: template.id })) });
  return { ...user, exercise, template, program };
}
const apply = (f: Awaited<ReturnType<typeof fixture>>, requestId = "first") => request(app).put("/api/training-schedule").set(f.auth).send({ programId: f.program.id, requestId });

describe("applied training schedule", () => {
  it("starts with no plan and rejects foreign ownership", async () => {
    const f = await fixture();
    const other = await createAuthedUser();
    const empty = await request(app).get("/api/training-schedule").set(other.auth);
    expect(empty.status).toBe(200);
    expect(empty.body.data.current).toBeNull();
    expect(empty.body.data.days.every((d: { status: string }) => d.status === "NO_PLAN")).toBe(true);
    expect((await request(app).put("/api/training-schedule").set(other.auth).send({ programId: f.program.id, requestId: "x" })).status).toBe(404);
  });
  it("atomically applies today once, then replaces only tomorrow on retries/concurrent requests", async () => {
    const f = await fixture();
    const results = await Promise.all([apply(f), apply(f), apply(f)]);
    expect(results.map(r => r.status)).toEqual([200, 200, 200]);
    const today = todayInTimezone("Asia/Ho_Chi_Minh");
    expect(new Set(results.map(r => r.body.data.current.id)).size).toBe(1);
    expect(results[0].body.data.current.effectiveFrom).toBe(today);
    expect(results[0].body.data.days[0].status).toBe("NO_PLAN");
    f.program.name = "Changed"; await f.program.save();
    const next = await apply(f, "second");
    expect(next.body.data.current.name).toBe("Week");
    expect(next.body.data.pending).toMatchObject({ name: "Changed", effectiveFrom: addDays(today, 1) });
    const retry = await apply(f);
    expect(retry.body.data.current.id).toBe(results[0].body.data.current.id);
    expect(retry.body.data.pending.id).toBe(next.body.data.pending.id);
  });
  it("starts an immutable snapshot even after template deletion, once per day", async () => {
    const f = await fixture(); await apply(f);
    await WorkoutTemplateModel.deleteOne({ _id: f.template.id });
    const starts = await Promise.all(Array.from({ length: 3 }, () => request(app).post("/api/training-schedule/start").set(f.auth)));
    expect(starts.map(r => r.status)).toEqual([200, 200, 200]);
    expect(new Set(starts.map(r => r.body.data.id)).size).toBe(1);
    expect(starts[0].body.data.exercises[0]).toMatchObject({ exerciseName: "Bench", targetSets: 3 });
    expect(await WorkoutSessionModel.countDocuments({ userId: f.userId })).toBe(1);
    const history = await request(app).get("/api/progress/history").set(f.auth);
    expect(history.status).toBe(200);
    expect(history.body.data.days[0].trainingSchedule.status).toBe("IN_PROGRESS");
  });
  it("expires past scheduled sessions, preserves sets and rejects late writes", async () => {
    const f = await fixture(); await apply(f);
    const start = await request(app).post("/api/training-schedule/start").set(f.auth);
    expect(start.status).toBe(200);
    const id = start.body.data.id;
    await WorkoutSessionModel.updateOne({ _id: id }, { $set: { scheduledDate: addDays(todayInTimezone("Asia/Ho_Chi_Minh"), -1), "exercises.0.sets": [{ setNumber: 1, weight: 20, reps: 8, completed: true }] } });
    const late = await request(app).post(`/api/workout-sessions/${id}/complete`).set(f.auth);
    expect(late.status).toBe(409);
    const session = await WorkoutSessionModel.findById(id);
    expect(session?.status).toBe("CANCELLED");
    expect(session?.exercises[0].sets).toHaveLength(1);
    expect((await request(app).get("/api/workout-sessions/active").set(f.auth)).body.data).toBeNull();
  });
});
