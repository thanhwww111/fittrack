import request from "supertest";
import { afterEach, expect, it, vi } from "vitest";
import app from "../src/app";
import { FoodModel } from "../src/models/food.model";
import { CustomMealModel } from "../src/models/customMeal.model";
import { llm } from "../src/services/ai/llm";
import { todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();
afterEach(() => vi.restoreAllMocks());
const date = () => todayInTimezone("Asia/Ho_Chi_Minh");
const defaults = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const createMeal = (auth: Record<string, string>, name = "Trước tập") => request(app).post("/api/meals").set(auth).send({ name });

it("persists normalized account-specific meals after defaults and rejects duplicate names", async () => {
  const a = await createAuthedUser();
  const b = await createAuthedUser();
  expect((await request(app).get("/api/meals")).status).toBe(401);
  const created = await createMeal(a.auth, "  Trước   tập  ");
  expect(created.status).toBe(201);
  expect(created.body.data).toEqual({ id: expect.stringMatching(/^CUSTOM_[a-f0-9]{24}$/), name: "Trước tập", isCustom: true });
  const list = await request(app).get("/api/meals").set(a.auth);
  expect(list.body.data.map((m: { id: string }) => m.id)).toEqual([...defaults, created.body.data.id]);
  expect((await request(app).get("/api/meals").set(b.auth)).body.data).toHaveLength(4);
  expect((await createMeal(a.auth, "TRƯỚC TẬP")).status).toBe(409);
  expect((await createMeal(a.auth, "BỮA SÁNG")).status).toBe(409);
  expect((await createMeal(b.auth)).status).toBe(201);
  for (const name of [" ", "x".repeat(41), 123]) {
    expect((await request(app).post("/api/meals").set(a.auth).send({ name })).status).toBe(400);
  }
  const race = await Promise.all([createMeal(a.auth, "Sau tập"), createMeal(a.auth, "SAU TẬP")]);
  expect(race.map(r => r.status).sort()).toEqual([201, 409]);
  expect((await request(app).delete("/api/auth/me").set(a.auth).send({ password: "password123" })).status).toBe(204);
  expect(await CustomMealModel.countDocuments({ userId: a.userId })).toBe(0);
  expect(await CustomMealModel.countDocuments({ userId: b.userId })).toBe(1);
});

it("roundtrips custom logs, edits, copies and templates with cumulative daily totals and AI context", async () => {
  const { auth } = await createAuthedUser();
  const pre = await createMeal(auth);
  expect(pre.status).toBe(201);
  const post = (await createMeal(auth, "Sau tập")).body.data.id;
  const mealType = pre.body.data.id;
  const food = await FoodModel.create({ name: "Shake", servingSize: 1, servingUnit: "piece", calories: 100, protein: 10, carbs: 10, fat: 2 });
  const log = await request(app).post("/api/food-logs").set(auth).send({ mealType, foodId: food.id, quantity: 1 });
  expect(log.status).toBe(201);
  const edit = await request(app).put(`/api/food-logs/${log.body.data.id}`).set(auth).send({ quantity: 2, mealType: post });
  expect(edit.status).toBe(200);
  expect(edit.body.data).toMatchObject({ mealType: post, calories: 200 });
  expect((await request(app).post("/api/food-logs/copy").set(auth).send({ fromDate: date(), fromMealType: post, toMealType: mealType })).status).toBe(201);
  const template = await request(app).post("/api/meal-templates/from-meal").set(auth).send({ name: "Shake template", date: date(), mealType });
  expect(template.status).toBe(201);
  expect((await request(app).post(`/api/meal-templates/${template.body.data.id}/apply`).set(auth).send({ mealType: post })).status).toBe(201);
  await request(app).post("/api/food-logs").set(auth).send({ mealType: "BREAKFAST", foodId: food.id, quantity: 1 });
  const summary = (await request(app).get("/api/nutrition/today").set(auth)).body.data;
  expect(summary.consumed.calories).toBe(700);
  expect(summary.meals[post].calories).toBe(400);
  expect(summary.meals[mealType].calories).toBe(200);
  expect(summary.meals.BREAKFAST.calories).toBe(100);
  expect(summary.mealOptions).toHaveLength(6);
  await request(app).post("/api/goals").set(auth).send({ mode: "MANUAL", calories: 2000, protein: 150, carbs: 200, fat: 60 });
  const spy = vi.spyOn(llm, "generateJson").mockResolvedValue({ suggestions: [] });
  const ai = await request(app).post("/api/ai/meal-suggestions").set(auth).send({ mealType });
  expect(ai.status).toBe(200);
  expect(ai.body.data.mealType).toBe(mealType);
  expect(spy.mock.calls[0][0].prompt).toContain("Trước tập");
  expect(spy.mock.calls[0][0].prompt).toContain("1300 kcal");
});

it("rejects foreign, nonexistent and malformed meal IDs on every write/source/AI path", async () => {
  const a = await createAuthedUser();
  const b = await createAuthedUser();
  const foreign = await createMeal(b.auth);
  expect(foreign.status).toBe(201);
  const food = await FoodModel.create({ name: "Shake", servingSize: 1, servingUnit: "piece", calories: 100, protein: 10, carbs: 10, fat: 2 });
  const base = { foodId: food.id, quantity: 1 };
  const log = await request(app).post("/api/food-logs").set(a.auth).send({ ...base, mealType: "LUNCH" });
  const template = await request(app).post("/api/meal-templates").set(a.auth).send({ name: "T", items: [base] });
  const spy = vi.spyOn(llm, "generateJson").mockResolvedValue({ suggestions: [] });
  for (const [mealType, status] of [[foreign.body.data.id, 404], ["CUSTOM_000000000000000000000000", 404], ["CUSTOM_bad", 400], ["BRUNCH", 400], ["CUSTOM_AAAAAAAAAAAAAAAAAAAAAAAA", 400]] as const) {
    const responses = await Promise.all([
      request(app).post("/api/food-logs").set(a.auth).send({ ...base, mealType }),
      request(app).put(`/api/food-logs/${log.body.data.id}`).set(a.auth).send({ mealType }),
      request(app).post("/api/food-logs/copy").set(a.auth).send({ fromDate: date(), fromMealType: mealType, toMealType: "DINNER" }),
      request(app).post("/api/food-logs/copy").set(a.auth).send({ fromDate: date(), fromMealType: "LUNCH", toMealType: mealType }),
      request(app).post("/api/meal-templates/from-meal").set(a.auth).send({ date: date(), mealType, name: "T" }),
      request(app).post(`/api/meal-templates/${template.body.data.id}/apply`).set(a.auth).send({ mealType }),
      request(app).post("/api/ai/meal-suggestions").set(a.auth).send({ mealType }),
    ]);
    expect(responses.map(r => r.status)).toEqual(Array(7).fill(status));
  }
  expect(spy).not.toHaveBeenCalled();
});
