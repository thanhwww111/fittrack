import { z } from "zod";
import { describe, expect, it } from "vitest";
import { toGeminiSchema } from "../src/services/ai/llm";
import {
  buildMealPrompt,
  buildWorkoutPrompt,
  mealSuggestionSchema,
  summarizeWorkoutHistory,
  type SessionForAnalysis,
} from "../src/services/ai/prompts";

describe("buildMealPrompt", () => {
  it("includes remaining macros, meal and goal", () => {
    const prompt = buildMealPrompt({
      mealType: "DINNER",
      remaining: { calories: 520.4, protein: 38.6, carbs: 40, fat: 12 },
      goalType: "MUSCLE_GAIN",
    });
    expect(prompt).toContain("bữa tối");
    expect(prompt).toContain("520 kcal");
    expect(prompt).toContain("protein 39 g");
    expect(prompt).toContain("tăng cơ");
    expect(prompt).not.toContain("Sở thích");
  });

  it("clamps negative remaining to zero and asks for a light option", () => {
    const prompt = buildMealPrompt({
      mealType: "SNACK",
      remaining: { calories: -200, protein: -5, carbs: 10, fat: 0 },
      goalType: null,
    });
    expect(prompt).toContain("0 kcal, protein 0 g");
    expect(prompt).toContain("rất nhẹ");
  });

  it("quotes user preferences as data", () => {
    const prompt = buildMealPrompt({
      mealType: "LUNCH",
      remaining: { calories: 700, protein: 40, carbs: 80, fat: 20 },
      goalType: null,
      preferences: "không ăn cay",
    });
    expect(prompt).toContain('"""không ăn cay"""');
  });
});

describe("summarizeWorkoutHistory", () => {
  const weeks = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"];
  const bench = (weight: number, reps: number) => ({
    exerciseName: "Bench Press",
    sets: [
      { weight: weight - 10, reps: reps + 2 },
      { weight, reps },
    ],
  });

  const sessions: SessionForAnalysis[] = [
    { date: "2026-09-02", totalVolume: 1000, exercises: [bench(50, 8)] },
    { date: "2026-09-04", totalVolume: 1200, exercises: [bench(52.5, 8)] },
    { date: "2026-09-16", totalVolume: 1300, exercises: [bench(55, 7)] },
    {
      date: "2026-09-23",
      totalVolume: 1400,
      exercises: [bench(55, 8), { exerciseName: "Pull-up", sets: [{ weight: 0, reps: 12 }] }],
    },
    // Trước tuần đầu: bị bỏ qua
    { date: "2026-08-20", totalVolume: 9999, exercises: [bench(100, 1)] },
  ];

  it("buckets sessions by week and keeps the best set per exercise", () => {
    const summary = summarizeWorkoutHistory(sessions, weeks);

    expect(summary.weeks.map((w) => [w.sessions, w.volume])).toEqual([
      [2, 2200],
      [0, 0],
      [1, 1300],
      [1, 1400],
    ]);
    const benchWeeks = summary.exercises.find((e) => e.name === "Bench Press")!.best;
    expect(benchWeeks.map((b) => (b ? `${b.weight}x${b.reps}` : null))).toEqual([
      "52.5x8",
      null,
      "55x7",
      "55x8",
    ]);
    // Bài tập nhiều nhất đứng đầu
    expect(summary.exercises[0].name).toBe("Bench Press");
  });

  it("formats a compact prompt, with bodyweight sets as reps", () => {
    const prompt = buildWorkoutPrompt(summarizeWorkoutHistory(sessions, weeks));
    expect(prompt).toContain("T1 (từ 2026-09-01): 2 buổi, tổng volume 2200 kg");
    expect(prompt).toContain("Bench Press: T1 52.5×8 | T2 - | T3 55×7 | T4 55×8");
    expect(prompt).toContain("Pull-up: T1 - | T2 - | T3 - | T4 12 rep");
    expect(prompt).not.toContain("100×1");
  });
});

describe("toGeminiSchema", () => {
  it("removes unsupported keys at every level", () => {
    const schema = toGeminiSchema(z.toJSONSchema(mealSuggestionSchema));
    const json = JSON.stringify(schema);
    expect(json).not.toContain("$schema");
    expect(json).not.toContain("additionalProperties");
    expect(json).toContain('"required"');
  });
});
