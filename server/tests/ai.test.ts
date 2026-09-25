import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { ExerciseModel } from "../src/models/exercise.model";
import { FoodModel } from "../src/models/food.model";
import { WorkoutSessionModel } from "../src/models/workoutSession.model";
import { seedExercises } from "../src/scripts/seedExercises";
import { seedFoods } from "../src/scripts/seedFoods";
import { llm } from "../src/services/ai/llm";
import { AppError } from "../src/utils/AppError";
import { todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

beforeEach(async () => {
  await Promise.all([seedFoods(), seedExercises()]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const suggestion = (name: string, calories: number) => ({
  name,
  description: "Món giàu protein",
  ingredients: [{ name: "Ức gà", amount: "150 g" }],
  calories,
  protein: 40,
  carbs: 30,
  fat: 10,
});

async function userWithTarget(calories = 2000) {
  const user = await createAuthedUser();
  await request(app)
    .post("/api/goals")
    .set(user.auth)
    .send({ mode: "MANUAL", calories, protein: 150, carbs: 200, fat: 60 });
  return user;
}

describe("POST /api/ai/meal-suggestions", () => {
  it("returns 503 when Gemini is not configured", async () => {
    const { auth } = await userWithTarget();
    const res = await request(app)
      .post("/api/ai/meal-suggestions")
      .set(auth)
      .send({ mealType: "DINNER" });

    expect(res.status).toBe(503);
  });

  it("sends the remaining macros and flags suggestions that fit", async () => {
    const { auth } = await userWithTarget(1000);
    const chicken = await FoodModel.findOne({ name: "Chicken Breast" });
    // Đã ăn 300g ức gà = 495 kcal → còn 505 kcal
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chicken!.id, quantity: 300 });

    const spy = vi.spyOn(llm, "generateJson").mockResolvedValue({
      suggestions: [suggestion("Cơm gà", 500), suggestion("Bún bò", 900)],
    });

    const res = await request(app)
      .post("/api/ai/meal-suggestions")
      .set(auth)
      .send({ mealType: "DINNER", preferences: "không ăn cay" });

    expect(res.status).toBe(200);
    expect(res.body.data.remaining.calories).toBe(505);
    expect(res.body.data.suggestions.map((s: { fitsRemaining: boolean }) => s.fitsRemaining)).toEqual([
      true,
      false,
    ]);

    const { prompt } = spy.mock.calls[0][0];
    expect(prompt).toContain("505 kcal");
    expect(prompt).toContain("bữa tối");
    expect(prompt).toContain("không ăn cay");
  });

  it("requires a nutrition target", async () => {
    const { auth } = await createAuthedUser();
    const spy = vi.spyOn(llm, "generateJson");

    const res = await request(app)
      .post("/api/ai/meal-suggestions")
      .set(auth)
      .send({ mealType: "LUNCH" });

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("validates input", async () => {
    const { auth } = await userWithTarget();
    const res = await request(app)
      .post("/api/ai/meal-suggestions")
      .set(auth)
      .send({ mealType: "BRUNCH", preferences: "x".repeat(300) });
    expect(res.status).toBe(400);
  });

  it("passes through AI errors as 502", async () => {
    const { auth } = await userWithTarget();
    vi.spyOn(llm, "generateJson").mockRejectedValue(
      new AppError(502, "AI returned an invalid response, please try again")
    );

    const res = await request(app)
      .post("/api/ai/meal-suggestions")
      .set(auth)
      .send({ mealType: "LUNCH" });
    expect(res.status).toBe(502);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/ai/meal-suggestions").send({ mealType: "LUNCH" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/ai/workout-analysis", () => {
  async function completed(userId: string, daysAgo: number, weight: number) {
    const bench = await ExerciseModel.findOne({ name: "Bench Press" });
    const at = new Date(Date.now() - daysAgo * 86_400_000);
    await WorkoutSessionModel.create({
      userId,
      name: "Push",
      status: "COMPLETED",
      startedAt: at,
      completedAt: at,
      totalVolume: weight * 8,
      exercises: [
        { exerciseId: bench!._id, exerciseName: "Bench Press", sets: [{ setNumber: 1, weight, reps: 8 }] },
      ],
    });
  }

  it("needs at least 2 recent workouts", async () => {
    const { auth, userId } = await createAuthedUser();
    await completed(userId, 1, 60);
    const spy = vi.spyOn(llm, "generateJson");

    const res = await request(app).post("/api/ai/workout-analysis").set(auth);
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("summarises the last 4 weeks for the model and returns its analysis", async () => {
    const { auth, userId } = await createAuthedUser();
    const other = await createAuthedUser();
    await completed(userId, 14, 50);
    await completed(userId, 0, 55);
    await completed(other.userId, 0, 200); // không được lẫn dữ liệu user khác
    await completed(userId, 60, 100); // quá 4 tuần, bị bỏ qua

    const spy = vi.spyOn(llm, "generateJson").mockResolvedValue({
      summary: "Bench Press tăng đều.",
      highlights: ["Tăng 5 kg trong 2 tuần"],
      suggestions: ["Thử 57.5 kg × 6"],
    });

    const res = await request(app).post("/api/ai/workout-analysis").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe("Bench Press tăng đều.");
    expect(res.body.data.weeks).toHaveLength(4);
    expect(res.body.data.weeks.at(-1).weekStart <= todayInTimezone("Asia/Ho_Chi_Minh")).toBe(true);

    const { prompt } = spy.mock.calls[0][0];
    expect(prompt).toContain("50×8");
    expect(prompt).toContain("55×8");
    expect(prompt).not.toContain("200×8");
    expect(prompt).not.toContain("100×8");
  });
});
