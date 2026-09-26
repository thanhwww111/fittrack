import { describe, expect, it } from "vitest";
import {
  calculateBMR,
  calculateNutritionTarget,
  type TargetInput,
} from "../src/utils/nutritionCalculator";
import { isValidDateString, todayInTimezone } from "../src/utils/date";

const male: TargetInput = {
  gender: "MALE",
  age: 25,
  height: 175,
  currentWeight: 70,
  activityLevel: "MODERATE",
  goalType: "MAINTENANCE",
};

describe("calculateBMR", () => {
  it("uses Mifflin-St Jeor", () => {
    expect(calculateBMR(male)).toBeCloseTo(1673.75);
    expect(calculateBMR({ ...male, gender: "FEMALE" })).toBeCloseTo(1507.75);
  });
});

describe("calculateNutritionTarget", () => {
  it("computes maintenance macros", () => {
    expect(calculateNutritionTarget(male)).toEqual({
      calories: 2594,
      protein: 112,
      carbs: 375,
      fat: 72,
    });
  });

  it("adds a surplus and more protein for MUSCLE_GAIN", () => {
    const gain = calculateNutritionTarget({ ...male, goalType: "MUSCLE_GAIN" });
    expect(gain.calories).toBe(2894);
    expect(gain.protein).toBe(126);
  });

  it("sizes the surplus / deficit from the weekly goal rate (7700 kcal per kg)", () => {
    expect(calculateNutritionTarget({ ...male, goalType: "MUSCLE_GAIN", goalRate: 0.5 }).calories).toBe(3144);
    expect(calculateNutritionTarget({ ...male, goalType: "WEIGHT_LOSS", goalRate: 0.25 }).calories).toBe(2319);
    // Giữ cân thì tốc độ không có ý nghĩa
    expect(calculateNutritionTarget({ ...male, goalRate: 0.5 }).calories).toBe(2594);
  });

  it("never goes below the calorie floor", () => {
    const target = calculateNutritionTarget({
      gender: "FEMALE",
      age: 30,
      height: 160,
      currentWeight: 55,
      activityLevel: "SEDENTARY",
      goalType: "WEIGHT_LOSS",
    });
    expect(target).toEqual({ calories: 1200, protein: 110, carbs: 116, fat: 33 });
  });

  it("macros add up to roughly the calorie target", () => {
    const t = calculateNutritionTarget({ ...male, goalType: "WEIGHT_LOSS" });
    const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(fromMacros - t.calories)).toBeLessThanOrEqual(10);
  });
});

describe("date utils", () => {
  it("resolves today in the user's timezone", () => {
    // 2026-09-24 20:00 UTC là 2026-09-25 03:00 ở Việt Nam
    const now = new Date("2026-09-24T20:00:00Z");
    expect(todayInTimezone("Asia/Ho_Chi_Minh", now)).toBe("2026-09-25");
    expect(todayInTimezone("America/New_York", now)).toBe("2026-09-24");
  });

  it("validates real calendar dates", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("26-2-1")).toBe(false);
  });
});
