import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { FoodModel } from "../src/models/food.model";
import { llm } from "../src/services/ai/llm";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();
afterEach(() => vi.restoreAllMocks());

const option = {
  name: "Sandwich trứng nhỏ", servingSize: 1, servingUnit: "piece",
  calories: 180, protein: 8, carbs: 22, fat: 7, fiber: 2,
  description: "Một miếng khoảng 70 g, có trứng, không sốt.",
};

describe("POST /api/ai/food-estimates", () => {
  it("estimates without a nutrition target and does not create food", async () => {
    const { auth } = await createAuthedUser();
    const result = { suggestions: [option, { ...option, name: "Sandwich phô mai nhỏ" }] };
    const spy = vi.spyOn(llm, "generateJson").mockResolvedValue(result);
    const res = await request(app).post("/api/ai/food-estimates").set(auth)
      .send({ description: "1 miếng sandwich nhỏ" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(result);
    expect(spy.mock.calls[0][0].prompt).toContain("1 miếng sandwich nhỏ");
    expect(await FoodModel.countDocuments()).toBe(0);
  });

  it.each(["", "   ", "x".repeat(501)])("rejects invalid descriptions", async (description) => {
    const { auth } = await createAuthedUser();
    const spy = vi.spyOn(llm, "generateJson");
    const res = await request(app).post("/api/ai/food-estimates").set(auth).send({ description });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/ai/food-estimates").send({ description: "sandwich" });
    expect(res.status).toBe(401);
  });

  it("returns 503 when AI is unconfigured", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).post("/api/ai/food-estimates").set(auth).send({ description: "sandwich" });
    expect(res.status).toBe(503);
  });
});
