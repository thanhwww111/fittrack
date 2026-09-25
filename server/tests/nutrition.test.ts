import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { FoodModel } from "../src/models/food.model";
import { NutritionTargetModel } from "../src/models/nutritionTarget.model";
import { seedFoods } from "../src/scripts/seedFoods";
import { todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

let chickenId: string;
let riceId: string;

beforeEach(async () => {
  await seedFoods();
  chickenId = (await FoodModel.findOne({ name: "Chicken Breast" }))!.id;
  riceId = (await FoodModel.findOne({ name: "White Rice (cooked)" }))!.id;
});

const today = () => todayInTimezone("Asia/Ho_Chi_Minh");

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const target = { mode: "MANUAL", calories: 2500, protein: 130, carbs: 300, fat: 70 };

describe("GET /api/nutrition/today", () => {
  it("returns target, consumed, remaining and per-meal totals", async () => {
    const { auth } = await createAuthedUser();
    await request(app).post("/api/goals").set(auth).send(target);
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 200 });
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: riceId, quantity: 300 });
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "DINNER", foodId: chickenId, quantity: 100 });

    const res = await request(app).get("/api/nutrition/today").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      date: today(),
      target: { calories: 2500, protein: 130, carbs: 300, fat: 70 },
      // chicken 300g + rice 300g
      consumed: { calories: 885, protein: 101.1, carbs: 84.6, fat: 11.7 },
      remaining: { calories: 1615, protein: 28.9, carbs: 215.4, fat: 58.3 },
      logCount: 3,
    });
    expect(res.body.data.meals.LUNCH.calories).toBe(720);
    expect(res.body.data.meals.DINNER.calories).toBe(165);
    expect(res.body.data.meals.BREAKFAST.calories).toBe(0);
  });

  it("returns null target and remaining when no target is set", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/nutrition/today").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ target: null, remaining: null, logCount: 0 });
    expect(res.body.data.consumed.calories).toBe(0);
  });

  it("shows negative remaining when over target", async () => {
    const { auth } = await createAuthedUser();
    await request(app)
      .post("/api/goals")
      .set(auth)
      .send({ ...target, calories: 1000, protein: 20 });
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 700 });

    const res = await request(app).get("/api/nutrition/today").set(auth);
    expect(res.body.data.remaining.calories).toBe(-155);
    expect(res.body.data.remaining.protein).toBe(-197);
  });

  it("only counts the current user's logs", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    await request(app)
      .post("/api/food-logs")
      .set(bob.auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 100 });

    const res = await request(app).get("/api/nutrition/today").set(alice.auth);
    expect(res.body.data.consumed.calories).toBe(0);
  });
});

describe("GET /api/nutrition/daily", () => {
  it("uses the target that was active on that day", async () => {
    const { auth, userId } = await createAuthedUser();
    const lastMonth = shiftDate(today(), -30);
    await NutritionTargetModel.create({
      userId,
      effectiveFrom: lastMonth,
      source: "MANUAL",
      calories: 2200,
      protein: 110,
      carbs: 250,
      fat: 60,
    });
    await request(app).post("/api/goals").set(auth).send(target);

    const past = await request(app)
      .get(`/api/nutrition/daily?date=${shiftDate(today(), -5)}`)
      .set(auth);
    const beforeAny = await request(app)
      .get(`/api/nutrition/daily?date=${shiftDate(lastMonth, -1)}`)
      .set(auth);
    const now = await request(app).get(`/api/nutrition/daily?date=${today()}`).set(auth);

    expect(past.body.data.target.calories).toBe(2200);
    expect(beforeAny.body.data.target).toBeNull();
    expect(now.body.data.target.calories).toBe(2500);
  });

  it("rejects an invalid date", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/nutrition/daily?date=yesterday").set(auth);
    expect(res.status).toBe(400);
  });
});
