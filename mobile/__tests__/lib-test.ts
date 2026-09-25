import { formatTick, niceAxis, shortDate } from "@/components/charts/scale";
import { fieldErrorsFrom, parseNumber, validateEmail, validatePassword } from "@/lib/formErrors";
import { ApiError } from "@/api/client";
import { addDays, formatDayLabel, mealTypeForHour, previewNutrition } from "@/lib/nutrition";
import { formatClock, formatDuration, setVolume } from "@/lib/workout";
import type { Food } from "@/types/models";

describe("niceAxis", () => {
  it("rounds to clean ticks and starts bars at zero", () => {
    expect(niceAxis([18200, 24000], { includeZero: true })).toEqual({
      min: 0,
      max: 40000,
      ticks: [0, 20000, 40000],
    });
  });

  it("hugs the data for line charts", () => {
    const axis = niceAxis([54, 55.4]);
    expect(axis.min).toBe(54);
    expect(axis.max).toBeGreaterThanOrEqual(55.4);
    expect(axis.ticks[0]).toBe(54);
  });

  it("handles a single value and empty input", () => {
    expect(niceAxis([0], { includeZero: true }).max).toBeGreaterThan(0);
    expect(niceAxis([])).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });

  it("formats ticks and dates", () => {
    expect(formatTick(20000)).toBe("20k");
    expect(shortDate("2026-09-05")).toBe("5/9");
  });
});

describe("nutrition helpers", () => {
  const chicken = {
    id: "1",
    name: "Chicken",
    servingSize: 100,
    servingUnit: "g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    isCustom: false,
    createdBy: null,
  } as Food;

  it("previews nutrition like the server", () => {
    expect(previewNutrition(chicken, 150)).toEqual({
      calories: 247.5,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      fiber: 0,
    });
    expect(previewNutrition(chicken, 0)).toBeNull();
    expect(previewNutrition(chicken, Number.NaN)).toBeNull();
  });

  it("does calendar math and labels days", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatDayLabel("2026-09-25", "2026-09-25")).toBe("Hôm nay");
    expect(formatDayLabel("2026-09-24", "2026-09-25")).toBe("Hôm qua");
    expect(formatDayLabel("2026-09-21", "2026-09-25")).toBe("T2, 21/9");
  });

  it("suggests a meal by hour", () => {
    expect(mealTypeForHour(7)).toBe("BREAKFAST");
    expect(mealTypeForHour(12)).toBe("LUNCH");
    expect(mealTypeForHour(15)).toBe("SNACK");
    expect(mealTypeForHour(20)).toBe("DINNER");
  });
});

describe("workout helpers", () => {
  it("formats clocks and durations", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatDuration(540)).toBe("9 phút");
    expect(formatDuration(3725)).toBe("1h02p");
  });

  it("sums volume of completed sets only", () => {
    expect(
      setVolume([
        { setNumber: 1, weight: 60, reps: 8, completed: true },
        { setNumber: 2, weight: 100, reps: 5, completed: false },
      ])
    ).toBe(480);
  });
});

describe("form helpers", () => {
  it("validates email and password like the server", () => {
    expect(validateEmail("")).toBeDefined();
    expect(validateEmail("a@b")).toBeDefined();
    expect(validateEmail(" long@example.com ")).toBeUndefined();
    expect(validatePassword("1234567")).toBeDefined();
    expect(validatePassword("12345678")).toBeUndefined();
    expect(validatePassword("x".repeat(73))).toBeDefined();
  });

  it("parses numbers with comma decimals", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("55,5")).toBe(55.5);
    expect(parseNumber("abc")).toBeNaN();
  });

  it("maps server validation details to fields", () => {
    const err = new ApiError("Validation failed", 400, [
      { path: "email", message: "Invalid email" },
      { path: "email", message: "second message is ignored" },
      { path: "password", message: "Too short" },
    ]);
    expect(fieldErrorsFrom(err)).toEqual({ email: "Invalid email", password: "Too short" });
    expect(fieldErrorsFrom(new Error("x"))).toEqual({});
  });
});
