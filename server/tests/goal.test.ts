import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { NutritionTargetModel } from "../src/models/nutritionTarget.model";
import { todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

const completeProfile = {
  gender: "MALE",
  age: 25,
  height: 175,
  currentWeight: 70,
  activityLevel: "MODERATE",
  goalType: "MAINTENANCE",
};

const manual = { mode: "MANUAL", calories: 2500, protein: 130, carbs: 300, fat: 70 };

const today = () => todayInTimezone("Asia/Ho_Chi_Minh");

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("GET /api/goals/suggestion", () => {
  it("computes a target from a complete profile", async () => {
    const { auth } = await createAuthedUser();
    await request(app).put("/api/profile").set(auth).send(completeProfile);

    const res = await request(app).get("/api/goals/suggestion").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ calories: 2594, protein: 112, carbs: 375, fat: 72 });
  });

  it("lists missing profile fields", async () => {
    const { auth } = await createAuthedUser();
    await request(app).put("/api/profile").set(auth).send({ gender: "MALE", age: 25 });

    const res = await request(app).get("/api/goals/suggestion").set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.details.missingFields).toEqual(
      expect.arrayContaining(["height", "currentWeight", "activityLevel", "goalType"])
    );
  });
});

describe("POST /api/goals", () => {
  it("creates an AUTO target effective today", async () => {
    const { auth } = await createAuthedUser();
    await request(app).put("/api/profile").set(auth).send(completeProfile);

    const res = await request(app).post("/api/goals").set(auth).send({ mode: "AUTO" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ source: "AUTO", calories: 2594, effectiveFrom: today() });
  });

  it("creates a MANUAL target", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).post("/api/goals").set(auth).send(manual);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ source: "MANUAL", calories: 2500, protein: 130 });
  });

  it("rejects MANUAL without macros", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).post("/api/goals").set(auth).send({ mode: "MANUAL" });
    expect(res.status).toBe(400);
  });

  it("rejects a back-dated target", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/goals")
      .set(auth)
      .send({ ...manual, effectiveFrom: shiftDate(today(), -1) });
    expect(res.status).toBe(400);
  });

  it("rejects a second target on the same day", async () => {
    const { auth } = await createAuthedUser();
    await request(app).post("/api/goals").set(auth).send(manual);
    const res = await request(app).post("/api/goals").set(auth).send(manual);
    expect(res.status).toBe(409);
  });
});

describe("GET /api/goals", () => {
  it("returns the current target and the full history, keeping old targets", async () => {
    const { auth, userId } = await createAuthedUser();
    await NutritionTargetModel.create({
      userId,
      effectiveFrom: shiftDate(today(), -30),
      source: "MANUAL",
      calories: 2200,
      protein: 110,
      carbs: 250,
      fat: 60,
    });
    await request(app).post("/api/goals").set(auth).send(manual);
    await request(app)
      .post("/api/goals")
      .set(auth)
      .send({ ...manual, calories: 2700, effectiveFrom: shiftDate(today(), 7) });

    const res = await request(app).get("/api/goals").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.current.calories).toBe(2500);
    expect(res.body.data.history.map((t: { calories: number }) => t.calories)).toEqual([
      2700, 2500, 2200,
    ]);
  });
});

describe("PUT /api/goals/:id", () => {
  it("updates a target that is effective today", async () => {
    const { auth } = await createAuthedUser();
    const created = await request(app).post("/api/goals").set(auth).send({ ...manual });

    const res = await request(app)
      .put(`/api/goals/${created.body.data.id}`)
      .set(auth)
      .send({ calories: 2600, protein: 140, carbs: 300, fat: 70 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ calories: 2600, protein: 140 });
  });

  it("refuses to modify a past target", async () => {
    const { auth, userId } = await createAuthedUser();
    const old = await NutritionTargetModel.create({
      userId,
      effectiveFrom: shiftDate(today(), -10),
      source: "MANUAL",
      calories: 2200,
      protein: 110,
      carbs: 250,
      fat: 60,
    });

    const res = await request(app)
      .put(`/api/goals/${old.id}`)
      .set(auth)
      .send({ calories: 3000, protein: 110, carbs: 250, fat: 60 });
    expect(res.status).toBe(409);
    expect((await NutritionTargetModel.findById(old.id))?.calories).toBe(2200);
  });

  it("cannot modify another user's target", async () => {
    const owner = await createAuthedUser();
    const attacker = await createAuthedUser();
    const created = await request(app).post("/api/goals").set(owner.auth).send(manual);

    const res = await request(app)
      .put(`/api/goals/${created.body.data.id}`)
      .set(attacker.auth)
      .send({ calories: 1000, protein: 10, carbs: 10, fat: 10 });
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .put("/api/goals/not-an-id")
      .set(auth)
      .send({ calories: 2000, protein: 100, carbs: 200, fat: 60 });
    expect(res.status).toBe(400);
  });
});
