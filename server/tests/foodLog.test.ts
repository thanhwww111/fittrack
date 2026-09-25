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

beforeEach(async () => {
  await seedFoods();
  chickenId = (await FoodModel.findOne({ name: "Chicken Breast" }))!.id;
});

const today = () => todayInTimezone("Asia/Ho_Chi_Minh");

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("POST /api/food-logs", () => {
  it("computes the nutrition snapshot on the server", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 150 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      date: today(),
      foodName: "Chicken Breast",
      servingUnit: "g",
      quantity: 150,
      calories: 247.5,
      protein: 46.5,
    });
  });

  it("ignores nutrition values sent by the client", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 100, calories: 1, protein: 999 });

    expect(res.body.data).toMatchObject({ calories: 165, protein: 31 });
  });

  it("rejects zero or negative quantity", async () => {
    const { auth } = await createAuthedUser();
    for (const quantity of [0, -100]) {
      const res = await request(app)
        .post("/api/food-logs")
        .set(auth)
        .send({ mealType: "LUNCH", foodId: chickenId, quantity });
      expect(res.status).toBe(400);
    }
  });

  it("rejects future dates but allows past dates", async () => {
    const { auth } = await createAuthedUser();
    const base = { mealType: "DINNER", foodId: chickenId, quantity: 100 };

    const future = await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ ...base, date: shiftDate(today(), 1) });
    const past = await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ ...base, date: shiftDate(today(), -1) });

    expect(future.status).toBe(400);
    expect(past.status).toBe(201);
  });

  it("cannot log another user's custom food", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const food = await request(app).post("/api/foods").set(alice.auth).send({
      name: "Secret Shake",
      servingSize: 1,
      servingUnit: "piece",
      calories: 300,
      protein: 30,
      carbs: 20,
      fat: 5,
    });

    const res = await request(app)
      .post("/api/food-logs")
      .set(bob.auth)
      .send({ mealType: "SNACK", foodId: food.body.data.id, quantity: 1 });
    expect(res.status).toBe(404);
  });
});

describe("snapshot keeps history stable", () => {
  it("does not change when the food is edited or deleted later", async () => {
    const { auth } = await createAuthedUser();
    const food = await request(app).post("/api/foods").set(auth).send({
      name: "Protein Bar",
      servingSize: 1,
      servingUnit: "piece",
      calories: 200,
      protein: 20,
      carbs: 20,
      fat: 7,
    });
    const foodId = food.body.data.id;
    await request(app).post("/api/food-logs").set(auth).send({ mealType: "SNACK", foodId, quantity: 2 });

    await request(app).put(`/api/foods/${foodId}`).set(auth).send({ protein: 10 });
    await request(app).delete(`/api/foods/${foodId}`).set(auth);

    const res = await request(app).get("/api/food-logs").set(auth);
    expect(res.body.data.items[0]).toMatchObject({ foodName: "Protein Bar", calories: 400, protein: 40 });
  });
});

describe("GET /api/food-logs", () => {
  it("returns only the requested day for the current user", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const base = { mealType: "LUNCH", foodId: chickenId, quantity: 100 };

    await request(app).post("/api/food-logs").set(alice.auth).send(base);
    await request(app)
      .post("/api/food-logs")
      .set(alice.auth)
      .send({ ...base, date: shiftDate(today(), -1) });
    await request(app).post("/api/food-logs").set(bob.auth).send(base);

    const res = await request(app).get(`/api/food-logs?date=${today()}`).set(alice.auth);
    expect(res.body.data.date).toBe(today());
    expect(res.body.data.items).toHaveLength(1);
  });

  it("rejects an invalid date query", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/food-logs?date=2026-13-01").set(auth);
    expect(res.status).toBe(400);
  });
});

describe("PUT/DELETE /api/food-logs/:id", () => {
  it("rescales nutrition when quantity changes", async () => {
    const { auth } = await createAuthedUser();
    const log = await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 200 });

    const res = await request(app)
      .put(`/api/food-logs/${log.body.data.id}`)
      .set(auth)
      .send({ quantity: 100, mealType: "DINNER" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ quantity: 100, mealType: "DINNER", calories: 165 });
  });

  it("cannot modify or delete another user's food log", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const log = await request(app)
      .post("/api/food-logs")
      .set(alice.auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 100 });
    const id = log.body.data.id;

    const put = await request(app).put(`/api/food-logs/${id}`).set(bob.auth).send({ quantity: 1 });
    const del = await request(app).delete(`/api/food-logs/${id}`).set(bob.auth);
    expect(put.status).toBe(404);
    expect(del.status).toBe(404);

    const own = await request(app).delete(`/api/food-logs/${id}`).set(alice.auth);
    expect(own.status).toBe(204);
  });
});
