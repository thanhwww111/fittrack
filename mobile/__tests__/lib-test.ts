import { formatTick, niceAxis, shortDate } from "@/components/charts/scale";
import { fieldErrorsFrom, parseNumber, validateEmail, validatePassword } from "@/lib/formErrors";
import { ApiError } from "@/api/client";
import { addDays, formatDayLabel, mealTypeForHour, previewNutrition } from "@/lib/nutrition";
import { measurementSummary } from "@/lib/measurements";
import { describeTargetChange } from "@/lib/targetRecalculation";
import { formatDayAdherence, formatSignedPercent } from "@/lib/weekly";
import { dayName, formatRate, programDayFor } from "@/lib/goal";
import { formatClock, formatDuration, setVolume } from "@/lib/workout";
import type { BodyMeasurement, Food } from "@/types/models";

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

describe("measurementSummary", () => {
  const base: BodyMeasurement = {
    id: "m1",
    date: "2026-09-25",
    weight: 70,
    bodyFat: null,
    chest: null,
    waist: null,
    arm: null,
    thigh: null,
  };

  it("is empty when only weight was recorded", () => {
    expect(measurementSummary(base)).toBe("");
  });

  it("lists the optional measurements that were entered, weight excluded", () => {
    expect(measurementSummary({ ...base, bodyFat: 18.5, waist: 80 })).toBe("Mỡ 18,5% · Eo 80 cm");
  });
});

describe("describeTargetChange", () => {
  const current = { calories: 2594, protein: 112, carbs: 375, fat: 72 };

  it("lists only the macros that changed, old → new", () => {
    expect(describeTargetChange(current, { ...current, calories: 2894, protein: 120 })).toBe(
      "Calo: 2594 → 2894 kcal\nProtein: 112 → 120 g"
    );
  });

  it("is empty when nothing changed", () => {
    expect(describeTargetChange(current, { ...current })).toBe("");
  });
});

describe("weekly formatting", () => {
  it("signs percent changes", () => {
    expect(formatSignedPercent(8.2)).toBe("+8,2%");
    expect(formatSignedPercent(-3)).toBe("-3%");
    expect(formatSignedPercent(0)).toBe("0%");
  });

  it("shows adherence as percent with the day count", () => {
    expect(formatDayAdherence({ met: 4, days: 5, percent: 80 })).toEqual({ value: "80%", hint: "4/5 ngày" });
    expect(formatDayAdherence({ met: 0, days: 0, percent: null })).toEqual({
      value: "—",
      hint: "chưa có dữ liệu",
    });
  });
});

describe("goal helpers", () => {
  it("formats signed weekly rates", () => {
    expect(formatRate(0.25)).toBe("+0,25 kg/tuần");
    expect(formatRate(-0.5)).toBe("-0,5 kg/tuần");
    expect(formatRate(0)).toBe("0 kg/tuần");
  });

  it("maps weekdays and finds the session of a day", () => {
    expect(dayName(1)).toBe("Thứ 2");
    expect(dayName(7)).toBe("Chủ nhật");
    const program = {
      id: "p",
      name: "PPL",
      isFavorite: true,
      presetKey: null,
      days: [{ dayOfWeek: 3, templateId: "t", templateName: "Pull", exerciseCount: 6 }],
    };
    expect(programDayFor(program, 3)?.templateName).toBe("Pull");
    expect(programDayFor(program, 4)).toBeNull();
  });
});
