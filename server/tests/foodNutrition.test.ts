import { describe, expect, it } from "vitest";
import { calculateNutrition, rescaleSnapshot, sumNutrition } from "../src/utils/foodNutrition";

const chicken = { servingSize: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 };
const egg = { servingSize: 1, calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 };

describe("calculateNutrition", () => {
  it("scales per-serving values by quantity", () => {
    expect(calculateNutrition(chicken, 150)).toEqual({
      calories: 247.5,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      fiber: 0,
    });
  });

  it("works with piece-based servings", () => {
    expect(calculateNutrition(egg, 4)).toMatchObject({ calories: 288, protein: 25.2 });
  });

  it("rejects non-positive quantity", () => {
    expect(() => calculateNutrition(chicken, 0)).toThrow(RangeError);
    expect(() => calculateNutrition(chicken, -100)).toThrow(RangeError);
  });
});

describe("rescaleSnapshot", () => {
  it("rescales from the stored snapshot, not from the current food", () => {
    const snapshot = calculateNutrition(chicken, 200);
    expect(rescaleSnapshot(snapshot, 200, 100)).toMatchObject({ calories: 165, protein: 31 });
  });
});

describe("sumNutrition", () => {
  it("adds items and rounds to one decimal", () => {
    const total = sumNutrition([
      calculateNutrition(chicken, 150),
      calculateNutrition(egg, 2),
      { calories: 0.1, protein: 0.2, carbs: 0, fat: 0, fiber: 0 },
    ]);
    expect(total).toEqual({ calories: 391.6, protein: 59.3, carbs: 0.8, fat: 15, fiber: 0 });
  });
});
