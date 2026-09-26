import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { ExerciseModel } from "../src/models/exercise.model";
import { WorkoutTemplateModel } from "../src/models/workoutTemplate.model";
import { seedExercises } from "../src/scripts/seedExercises";
import { todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

let benchId: string;

beforeEach(async () => {
  await seedExercises();
  benchId = (await ExerciseModel.findOne({ name: "Bench Press" }))!.id;
});

async function createTemplate(auth: Record<string, string>, name: string) {
  const res = await request(app)
    .post("/api/workout-templates")
    .set(auth)
    .send({ name, exercises: [{ exerciseId: benchId, targetSets: 3, targetReps: 8 }] });
  return res.body.data.id as string;
}

describe("GET /api/weekly-programs/presets", () => {
  it("lists the suggested weekly splits with their sessions", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/weekly-programs/presets").set(auth);

    expect(res.status).toBe(200);
    const keys = res.body.data.map((p: { key: string }) => p.key);
    expect(keys).toEqual(expect.arrayContaining(["ppl-3", "upper-lower-4", "full-body-3", "ppl-6"]));

    const ppl = res.body.data.find((p: { key: string }) => p.key === "ppl-3");
    expect(ppl.daysPerWeek).toBe(3);
    expect(ppl.days.map((d: { dayOfWeek: number }) => d.dayOfWeek)).toEqual([1, 3, 5]);
    expect(ppl.days[0].exercises[0]).toMatchObject({ name: "Bench Press" });
  });
});

describe("POST /api/weekly-programs/presets/:key/apply", () => {
  it("creates one template per distinct session and a program that uses them", async () => {
    const { auth, userId } = await createAuthedUser();
    const res = await request(app).post("/api/weekly-programs/presets/full-body-3/apply").set(auth);

    expect(res.status).toBe(201);
    expect(res.body.data.presetKey).toBe("full-body-3");
    expect(res.body.data.days.map((d: { dayOfWeek: number }) => d.dayOfWeek)).toEqual([1, 3, 5]);
    // Thứ Hai và thứ Sáu cùng là buổi A
    expect(res.body.data.days[0].templateId).toBe(res.body.data.days[2].templateId);
    expect(await WorkoutTemplateModel.countDocuments({ userId })).toBe(2);
  });

  it("returns 404 for an unknown preset", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).post("/api/weekly-programs/presets/nope/apply").set(auth);
    expect(res.status).toBe(404);
  });
});

describe("weekly program CRUD", () => {
  it("creates a custom week from the user's templates", async () => {
    const { auth } = await createAuthedUser();
    const push = await createTemplate(auth, "Push");
    const pull = await createTemplate(auth, "Pull");

    const res = await request(app)
      .post("/api/weekly-programs")
      .set(auth)
      .send({
        name: "Tuần của tôi",
        days: [
          { dayOfWeek: 4, templateId: pull },
          { dayOfWeek: 2, templateId: push },
        ],
      });

    expect(res.status).toBe(201);
    // Sắp theo thứ trong tuần
    expect(res.body.data.days).toEqual([
      { dayOfWeek: 2, templateId: push, templateName: "Push", exerciseCount: 1 },
      { dayOfWeek: 4, templateId: pull, templateName: "Pull", exerciseCount: 1 },
    ]);
    expect(res.body.data.isFavorite).toBe(false);
  });

  it("rejects two sessions on the same day", async () => {
    const { auth } = await createAuthedUser();
    const push = await createTemplate(auth, "Push");
    const res = await request(app)
      .post("/api/weekly-programs")
      .set(auth)
      .send({
        name: "X",
        days: [
          { dayOfWeek: 1, templateId: push },
          { dayOfWeek: 1, templateId: push },
        ],
      });
    expect(res.status).toBe(400);
  });

  it("cannot use another user's template or read another user's program", async () => {
    const owner = await createAuthedUser();
    const attacker = await createAuthedUser();
    const push = await createTemplate(owner.auth, "Push");

    const steal = await request(app)
      .post("/api/weekly-programs")
      .set(attacker.auth)
      .send({ name: "X", days: [{ dayOfWeek: 1, templateId: push }] });
    expect(steal.status).toBe(404);

    const program = await request(app)
      .post("/api/weekly-programs")
      .set(owner.auth)
      .send({ name: "Mine", days: [{ dayOfWeek: 1, templateId: push }] });
    const read = await request(app)
      .get(`/api/weekly-programs/${program.body.data.id}`)
      .set(attacker.auth);
    expect(read.status).toBe(404);
  });

  it("lists favorites first and tells which weekday it is for the user", async () => {
    const { auth } = await createAuthedUser();
    const first = await request(app).post("/api/weekly-programs/presets/ppl-3/apply").set(auth);
    await request(app).post("/api/weekly-programs/presets/upper-lower-4/apply").set(auth);

    const fav = await request(app).put(`/api/weekly-programs/${first.body.data.id}/favorite`).set(auth);
    expect(fav.body.data.isFavorite).toBe(true);

    const res = await request(app).get("/api/weekly-programs").set(auth);
    const day = new Date(`${todayInTimezone("Asia/Ho_Chi_Minh")}T00:00:00Z`).getUTCDay() || 7;
    expect(res.body.data.todayDayOfWeek).toBe(day);
    expect(res.body.data.items.map((p: { presetKey: string }) => p.presetKey)).toEqual([
      "ppl-3",
      "upper-lower-4",
    ]);

    const unfav = await request(app)
      .delete(`/api/weekly-programs/${first.body.data.id}/favorite`)
      .set(auth);
    expect(unfav.body.data.isFavorite).toBe(false);
  });

  it("drops the day when its template is deleted", async () => {
    const { auth } = await createAuthedUser();
    const push = await createTemplate(auth, "Push");
    const pull = await createTemplate(auth, "Pull");
    const program = await request(app)
      .post("/api/weekly-programs")
      .set(auth)
      .send({
        name: "W",
        days: [
          { dayOfWeek: 1, templateId: push },
          { dayOfWeek: 3, templateId: pull },
        ],
      });

    await request(app).delete(`/api/workout-templates/${push}`).set(auth);

    const res = await request(app).get(`/api/weekly-programs/${program.body.data.id}`).set(auth);
    expect(res.body.data.days.map((d: { dayOfWeek: number }) => d.dayOfWeek)).toEqual([3]);
  });

  it("updates and deletes a program but keeps its templates", async () => {
    const { auth, userId } = await createAuthedUser();
    const applied = await request(app).post("/api/weekly-programs/presets/ppl-3/apply").set(auth);
    const id = applied.body.data.id;

    const renamed = await request(app)
      .put(`/api/weekly-programs/${id}`)
      .set(auth)
      .send({ name: "PPL mới" });
    expect(renamed.body.data.name).toBe("PPL mới");

    const del = await request(app).delete(`/api/weekly-programs/${id}`).set(auth);
    expect(del.status).toBe(204);
    expect(await WorkoutTemplateModel.countDocuments({ userId })).toBe(3);
  });
});
