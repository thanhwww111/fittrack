import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { FoodModel } from "../src/models/food.model";
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

async function logFood(auth: object, body: object) {
  const res = await request(app).post("/api/food-logs").set(auth).send(body);
  expect(res.status).toBe(201);
  return res.body.data;
}

describe("meal templates", () => {
  it("creates a template with names and totals computed from current foods", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/meal-templates")
      .set(auth)
      .send({
        name: "Bữa trưa gym",
        items: [
          { foodId: chickenId, quantity: 150 },
          { foodId: riceId, quantity: 200 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Bữa trưa gym");
    expect(res.body.data.items[0]).toMatchObject({
      foodName: "Chicken Breast",
      available: true,
      nutrition: { calories: 247.5, protein: 46.5 },
    });
    expect(res.body.data.totals.calories).toBeGreaterThan(247.5);
  });

  it("rejects foods the user cannot see", async () => {
    const owner = await createAuthedUser();
    const other = await createAuthedUser();
    const food = await request(app).post("/api/foods").set(owner.auth).send({
      name: "Secret",
      servingSize: 100,
      servingUnit: "g",
      calories: 100,
      protein: 1,
      carbs: 1,
      fat: 1,
    });

    const res = await request(app)
      .post("/api/meal-templates")
      .set(other.auth)
      .send({ name: "X", items: [{ foodId: food.body.data.id, quantity: 100 }] });
    expect(res.status).toBe(404);
  });

  it("saves a logged meal as a template", async () => {
    const { auth } = await createAuthedUser();
    await logFood(auth, { mealType: "BREAKFAST", foodId: chickenId, quantity: 100 });
    await logFood(auth, { mealType: "BREAKFAST", foodId: riceId, quantity: 150 });
    await logFood(auth, { mealType: "LUNCH", foodId: riceId, quantity: 999 });

    const res = await request(app)
      .post("/api/meal-templates/from-meal")
      .set(auth)
      .send({ name: "Sáng quen thuộc", date: today(), mealType: "BREAKFAST" });

    expect(res.status).toBe(201);
    expect(res.body.data.items.map((i: { quantity: number }) => i.quantity)).toEqual([100, 150]);
  });

  it("applies a template as food logs and skips deleted foods", async () => {
    const { auth } = await createAuthedUser();
    const custom = await request(app).post("/api/foods").set(auth).send({
      name: "Sữa chua",
      servingSize: 100,
      servingUnit: "g",
      calories: 60,
      protein: 4,
      carbs: 7,
      fat: 2,
    });
    const template = await request(app)
      .post("/api/meal-templates")
      .set(auth)
      .send({
        name: "Snack",
        items: [
          { foodId: chickenId, quantity: 100 },
          { foodId: custom.body.data.id, quantity: 100 },
        ],
      });
    await request(app).delete(`/api/foods/${custom.body.data.id}`).set(auth);

    const res = await request(app)
      .post(`/api/meal-templates/${template.body.data.id}/apply`)
      .set(auth)
      .send({ mealType: "SNACK" });

    expect(res.status).toBe(201);
    expect(res.body.data.skipped).toBe(1);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ mealType: "SNACK", date: today(), calories: 165 });

    const list = await request(app).get("/api/meal-templates").set(auth);
    expect(list.body.data[0].items[1]).toMatchObject({ available: false, foodName: null });
  });

  it("updates, deletes and hides templates of other users", async () => {
    const owner = await createAuthedUser();
    const other = await createAuthedUser();
    const created = await request(app)
      .post("/api/meal-templates")
      .set(owner.auth)
      .send({ name: "A", items: [{ foodId: chickenId, quantity: 100 }] });
    const id = created.body.data.id;

    expect((await request(app).put(`/api/meal-templates/${id}`).set(other.auth).send({ name: "B" })).status).toBe(404);

    const updated = await request(app).put(`/api/meal-templates/${id}`).set(owner.auth).send({ name: "B" });
    expect(updated.body.data.name).toBe("B");

    expect((await request(app).delete(`/api/meal-templates/${id}`).set(owner.auth)).status).toBe(204);
    expect((await request(app).get("/api/meal-templates").set(owner.auth)).body.data).toEqual([]);
  });
});

describe("POST /api/food-logs/copy", () => {
  it("copies yesterday's meal into today with the same snapshot", async () => {
    const { auth } = await createAuthedUser();
    const yesterday = shiftDate(today(), -1);
    await logFood(auth, { date: yesterday, mealType: "DINNER", foodId: chickenId, quantity: 200 });

    const res = await request(app)
      .post("/api/food-logs/copy")
      .set(auth)
      .send({ fromDate: yesterday, fromMealType: "DINNER" });

    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({
      date: today(),
      mealType: "DINNER",
      quantity: 200,
      calories: 330,
    });
  });

  it("returns 404 when the source meal is empty and 400 when copying onto itself", async () => {
    const { auth } = await createAuthedUser();
    const empty = await request(app)
      .post("/api/food-logs/copy")
      .set(auth)
      .send({ fromDate: today(), fromMealType: "LUNCH", toMealType: "DINNER" });
    expect(empty.status).toBe(404);

    const same = await request(app)
      .post("/api/food-logs/copy")
      .set(auth)
      .send({ fromDate: today(), fromMealType: "LUNCH" });
    expect(same.status).toBe(400);
  });
});

describe("GET /api/foods/recent", () => {
  it("returns distinct foods, most recently logged first", async () => {
    const { auth } = await createAuthedUser();
    await logFood(auth, { mealType: "LUNCH", foodId: chickenId, quantity: 100 });
    await logFood(auth, { mealType: "LUNCH", foodId: riceId, quantity: 100 });
    await logFood(auth, { mealType: "DINNER", foodId: chickenId, quantity: 100 });

    const res = await request(app).get("/api/foods/recent").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.map((f: { name: string }) => f.name)).toEqual([
      "Chicken Breast",
      "White Rice (cooked)",
    ]);
  });
});

describe("water", () => {
  it("adds, clamps at zero and sets the daily amount", async () => {
    const { auth } = await createAuthedUser();

    const empty = await request(app).get("/api/water").set(auth);
    expect(empty.body.data).toMatchObject({ date: today(), amount: 0, target: 2000 });

    await request(app).post("/api/water/add").set(auth).send({ amount: 250 });
    const added = await request(app).post("/api/water/add").set(auth).send({ amount: 500 });
    expect(added.status).toBe(200);
    expect(added.body.data.amount).toBe(750);

    const clamped = await request(app).post("/api/water/add").set(auth).send({ amount: -2000 });
    expect(clamped.body.data.amount).toBe(0);

    const set = await request(app).put("/api/water").set(auth).send({ amount: 1200 });
    expect(set.body.data.amount).toBe(1200);
    expect((await request(app).get("/api/water").set(auth)).body.data.amount).toBe(1200);
  });

  it("uses the profile weight for the target and rejects future dates", async () => {
    const { auth } = await createAuthedUser();
    await request(app).put("/api/profile").set(auth).send({ currentWeight: 80 });
    expect((await request(app).get("/api/water").set(auth)).body.data.target).toBe(2800);

    const future = await request(app)
      .post("/api/water/add")
      .set(auth)
      .send({ amount: 250, date: shiftDate(today(), 1) });
    expect(future.status).toBe(400);
  });
});
