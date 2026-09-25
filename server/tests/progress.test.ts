import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import { ExerciseModel } from "../src/models/exercise.model";
import { FoodModel } from "../src/models/food.model";
import { NutritionTargetModel } from "../src/models/nutritionTarget.model";
import { PersonalRecordModel } from "../src/models/personalRecord.model";
import { UserProfileModel } from "../src/models/userProfile.model";
import { WorkoutSessionModel } from "../src/models/workoutSession.model";
import { seedExercises } from "../src/scripts/seedExercises";
import { seedFoods } from "../src/scripts/seedFoods";
import { addDays, dateRange, daysBetween, startOfWeek, todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

const today = () => todayInTimezone("Asia/Ho_Chi_Minh");
// 12:00 giờ Việt Nam của một ngày
const noonVN = (date: string) => new Date(`${date}T05:00:00Z`);

let chickenId: string;
let benchId: string;

beforeEach(async () => {
  await Promise.all([seedFoods(), seedExercises()]);
  chickenId = (await FoodModel.findOne({ name: "Chicken Breast" }))!.id;
  benchId = (await ExerciseModel.findOne({ name: "Bench Press" }))!.id;
});

async function completedSession(userId: string, date: string, volume: number, status = "COMPLETED") {
  await WorkoutSessionModel.create({
    userId,
    name: "Session",
    status,
    startedAt: noonVN(date),
    completedAt: status === "COMPLETED" ? noonVN(date) : null,
    totalVolume: volume,
    duration: 3600,
    exercises: [
      {
        exerciseId: benchId,
        exerciseName: "Bench Press",
        sets: [
          { setNumber: 1, weight: 60, reps: 8 },
          { setNumber: 2, weight: 60, reps: 8 },
        ],
      },
    ],
  });
}

describe("date helpers", () => {
  it("handles calendar arithmetic on YYYY-MM-DD strings", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(startOfWeek("2026-09-25")).toBe("2026-09-21"); // thứ Sáu → thứ Hai
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21"); // Chủ nhật vẫn thuộc tuần đó
    expect(startOfWeek("2026-09-21")).toBe("2026-09-21");
    expect(dateRange("2026-09-29", "2026-10-02")).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(daysBetween("2026-09-01", "2026-10-01")).toBe(30);
  });
});

describe("body measurements", () => {
  it("creates, then overwrites the same day", async () => {
    const { auth } = await createAuthedUser();
    const first = await request(app)
      .post("/api/body-measurements")
      .set(auth)
      .send({ weight: 55, waist: 72 });
    const second = await request(app).post("/api/body-measurements").set(auth).send({ weight: 55.2 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data).toMatchObject({ date: today(), weight: 55.2, waist: null });

    const list = await request(app).get("/api/body-measurements").set(auth);
    expect(list.body.data).toHaveLength(1);
  });

  it("rejects future dates and invalid values", async () => {
    const { auth } = await createAuthedUser();
    const future = await request(app)
      .post("/api/body-measurements")
      .set(auth)
      .send({ weight: 55, date: addDays(today(), 1) });
    const invalid = await request(app)
      .post("/api/body-measurements")
      .set(auth)
      .send({ weight: -20, bodyFat: 90 });

    expect(future.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it("keeps profile.currentWeight equal to the latest measurement", async () => {
    const { auth, userId } = await createAuthedUser();
    const weight = async () => (await UserProfileModel.findOne({ userId }))!.currentWeight;

    await request(app).post("/api/body-measurements").set(auth).send({ weight: 56 });
    // Nhập bù ngày cũ không được ghi đè cân nặng hiện tại
    const old = await request(app)
      .post("/api/body-measurements")
      .set(auth)
      .send({ weight: 54, date: addDays(today(), -10) });
    expect(await weight()).toBe(56);

    const latest = await request(app).get("/api/body-measurements").set(auth);
    await request(app).delete(`/api/body-measurements/${latest.body.data[1].id}`).set(auth);
    expect(await weight()).toBe(54);
    expect(old.status).toBe(201);
  });

  it("cannot delete another user's measurement", async () => {
    const alice = await createAuthedUser();
    const bob = await createAuthedUser();
    const m = await request(app).post("/api/body-measurements").set(alice.auth).send({ weight: 60 });

    const res = await request(app).delete(`/api/body-measurements/${m.body.data.id}`).set(bob.auth);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/progress/weight", () => {
  it("returns points in the range and the change", async () => {
    const { auth } = await createAuthedUser();
    const weights = [54, 54.5, 55, 55.4];
    for (const [i, weight] of weights.entries()) {
      await request(app)
        .post("/api/body-measurements")
        .set(auth)
        .send({ weight, date: addDays(today(), -21 + i * 7) });
    }
    await request(app)
      .post("/api/body-measurements")
      .set(auth)
      .send({ weight: 50, date: addDays(today(), -200) });

    const res = await request(app).get("/api/progress/weight").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.points.map((p: { weight: number }) => p.weight)).toEqual(weights);
    expect(res.body.data.summary).toEqual({ start: 54, current: 55.4, change: 1.4 });
  });

  it("validates the range", async () => {
    const { auth } = await createAuthedUser();
    const reversed = await request(app)
      .get("/api/progress/weight?from=2026-09-10&to=2026-09-01")
      .set(auth);
    const tooLong = await request(app)
      .get("/api/progress/weight?from=2024-01-01&to=2026-01-01")
      .set(auth);

    expect(reversed.status).toBe(400);
    expect(tooLong.status).toBe(400);
  });

  it("returns null summary without data", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/progress/weight").set(auth);
    expect(res.body.data.summary).toEqual({ start: null, current: null, change: null });
  });
});

describe("GET /api/progress/workout", () => {
  it("groups completed sessions into zero-filled weeks", async () => {
    const { auth, userId } = await createAuthedUser();
    const other = await createAuthedUser();
    const thisWeek = startOfWeek(today());

    await completedSession(userId, today(), 1000);
    await completedSession(userId, thisWeek, 500);
    await completedSession(userId, addDays(thisWeek, -14), 800);
    await completedSession(userId, addDays(thisWeek, -14), 300, "CANCELLED");
    await completedSession(other.userId, today(), 9999);

    const res = await request(app).get("/api/progress/workout?weeks=4").set(auth);

    expect(res.status).toBe(200);
    const weeks = res.body.data.weeks;
    expect(weeks.map((w: { weekStart: string }) => w.weekStart)).toEqual([
      addDays(thisWeek, -21),
      addDays(thisWeek, -14),
      addDays(thisWeek, -7),
      thisWeek,
    ]);
    expect(weeks.map((w: { totalVolume: number }) => w.totalVolume)).toEqual([0, 800, 0, 1500]);
    expect(weeks[3]).toMatchObject({ sessions: 2, sets: 4, duration: 7200 });
  });
});

describe("GET /api/progress/nutrition", () => {
  it("returns every day with the target active that day", async () => {
    const { auth, userId } = await createAuthedUser();
    const from = addDays(today(), -6);
    await NutritionTargetModel.create({
      userId,
      effectiveFrom: addDays(today(), -3),
      source: "MANUAL",
      calories: 1650,
      protein: 150,
      carbs: 150,
      fat: 50,
    });
    // Ngày -5: 500g ức gà (825 kcal, 155g protein), chưa có target
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 500, date: addDays(today(), -5) });
    // Hôm nay: 1000g (1650 kcal, 310g protein), đúng target calo và đủ protein
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "DINNER", foodId: chickenId, quantity: 1000 });

    const res = await request(app).get("/api/progress/nutrition").set(auth);
    const { days, summary } = res.body.data;

    expect(res.status).toBe(200);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe(from);
    expect(days[1]).toMatchObject({ logged: true, target: null });
    expect(days[1].consumed.calories).toBe(825);
    expect(days[2]).toMatchObject({ logged: false, target: null });
    expect(days[6].target.calories).toBe(1650);
    expect(summary).toMatchObject({
      loggedDays: 2,
      daysOnCalorieTarget: 1,
      daysProteinGoalMet: 1,
    });
    expect(summary.averages.calories).toBe(1237.5);
  });
});

describe("GET /api/progress/weekly", () => {
  it("summarises the current week", async () => {
    const { auth, userId } = await createAuthedUser();
    const weekStart = startOfWeek(today());

    await request(app)
      .post("/api/body-measurements")
      .set(auth)
      .send({ weight: 55, date: addDays(weekStart, -2) });
    await request(app).post("/api/body-measurements").set(auth).send({ weight: 55.4 });
    await completedSession(userId, today(), 1200);
    await completedSession(userId, addDays(weekStart, -1), 5000); // tuần trước
    await request(app)
      .post("/api/food-logs")
      .set(auth)
      .send({ mealType: "LUNCH", foodId: chickenId, quantity: 200 });
    await PersonalRecordModel.create({
      userId,
      exerciseId: benchId,
      exerciseName: "Bench Press",
      maxWeight: 60,
      maxReps: 8,
      estimatedOneRepMax: 76,
      achievedAt: noonVN(today()),
    });

    const res = await request(app).get("/api/progress/weekly").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      weekStart,
      today: today(),
      workout: { sessions: 1, sets: 2, totalVolume: 1200 },
      weight: { current: 55.4, baseline: 55, change: 0.4 },
      newPersonalRecords: 1,
    });
    expect(res.body.data.nutrition.loggedDays).toBe(1);
    expect(res.body.data.nutrition.averages.calories).toBe(330);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/progress/weekly");
    expect(res.status).toBe(401);
  });
});
