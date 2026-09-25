import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { FoodModel } from "../src/models/food.model";
import { seedFoods, SYSTEM_FOODS } from "../src/scripts/seedFoods";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

beforeEach(async () => {
  await seedFoods();
});

const customFood = {
  name: "Chicken Rice Bowl",
  servingSize: 1,
  servingUnit: "piece",
  calories: 550,
  protein: 40,
  carbs: 60,
  fat: 12,
};

describe("seedFoods", () => {
  it("is idempotent", async () => {
    await seedFoods();
    expect(await FoodModel.countDocuments({ createdBy: null })).toBe(SYSTEM_FOODS.length);
  });
});

describe("GET /api/foods", () => {
  it("lists system foods with pagination", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/foods?limit=5").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(5);
    expect(res.body.data.total).toBe(SYSTEM_FOODS.length);
  });

  it("searches by name, case-insensitive and partial", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/foods?search=CHICK").set(auth);

    expect(res.body.data.items.map((f: { name: string }) => f.name)).toEqual(["Chicken Breast"]);
  });

  it("treats regex characters in search as plain text", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/foods?search=.*").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it("shows own custom foods but not other users' custom foods", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    await request(app).post("/api/foods").set(alice.auth).send(customFood);

    const aliceCustom = await request(app).get("/api/foods?scope=custom").set(alice.auth);
    const bobSearch = await request(app).get("/api/foods?search=bowl").set(bob.auth);

    expect(aliceCustom.body.data.items).toHaveLength(1);
    expect(bobSearch.body.data.items).toHaveLength(0);
  });
});

describe("POST /api/foods", () => {
  it("creates a custom food owned by the user", async () => {
    const { auth, userId } = await createAuthedUser();
    const res = await request(app).post("/api/foods").set(auth).send(customFood);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ...customFood, isCustom: true, createdBy: userId, fiber: 0 });
  });

  it("rejects negative nutrition values", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/foods")
      .set(auth)
      .send({ ...customFood, protein: -5, servingSize: 0 });

    expect(res.status).toBe(400);
  });
});

describe("GET/PUT/DELETE /api/foods/:id", () => {
  it("cannot read another user's custom food", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const created = await request(app).post("/api/foods").set(alice.auth).send(customFood);

    const res = await request(app).get(`/api/foods/${created.body.data.id}`).set(bob.auth);
    expect(res.status).toBe(404);
  });

  it("updates and deletes own custom food", async () => {
    const { auth } = await createAuthedUser();
    const created = await request(app).post("/api/foods").set(auth).send(customFood);
    const id = created.body.data.id;

    const updated = await request(app).put(`/api/foods/${id}`).set(auth).send({ calories: 600 });
    expect(updated.body.data.calories).toBe(600);

    const deleted = await request(app).delete(`/api/foods/${id}`).set(auth);
    expect(deleted.status).toBe(204);
    expect(await FoodModel.exists({ _id: id })).toBeNull();
  });

  it("refuses to modify system foods", async () => {
    const { auth } = await createAuthedUser();
    const egg = await FoodModel.findOne({ name: "Egg" });

    const put = await request(app).put(`/api/foods/${egg!.id}`).set(auth).send({ calories: 1 });
    const del = await request(app).delete(`/api/foods/${egg!.id}`).set(auth);

    expect(put.status).toBe(403);
    expect(del.status).toBe(403);
  });

  it("cannot modify another user's custom food", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const created = await request(app).post("/api/foods").set(alice.auth).send(customFood);

    const res = await request(app)
      .put(`/api/foods/${created.body.data.id}`)
      .set(bob.auth)
      .send({ calories: 1 });
    expect(res.status).toBe(404);
  });
});
