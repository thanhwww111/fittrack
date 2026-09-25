import { describe, expect, it } from "vitest";
import {
  bestOfSets,
  calculateEstimated1RM,
  calculateVolume,
  detectPR,
} from "../src/utils/workoutMath";

describe("calculateVolume", () => {
  it("sums weight × reps of completed sets", () => {
    expect(
      calculateVolume([
        { weight: 60, reps: 8 },
        { weight: 60, reps: 8 },
        { weight: 62.5, reps: 6 },
      ])
    ).toBe(1335);
  });

  it("ignores sets that are not completed", () => {
    expect(
      calculateVolume([
        { weight: 100, reps: 5 },
        { weight: 100, reps: 5, completed: false },
      ])
    ).toBe(500);
  });

  it("is 0 for bodyweight sets and empty input", () => {
    expect(calculateVolume([{ weight: 0, reps: 15 }])).toBe(0);
    expect(calculateVolume([])).toBe(0);
  });
});

describe("calculateEstimated1RM", () => {
  it("uses the Epley formula", () => {
    expect(calculateEstimated1RM(60, 8)).toBe(76);
    expect(calculateEstimated1RM(100, 5)).toBe(116.7);
  });

  it("returns the weight itself for a single rep", () => {
    expect(calculateEstimated1RM(140, 1)).toBe(140);
  });

  it("returns 0 for bodyweight or invalid input", () => {
    expect(calculateEstimated1RM(0, 10)).toBe(0);
    expect(calculateEstimated1RM(50, 0)).toBe(0);
  });
});

describe("bestOfSets", () => {
  it("takes the best value of each metric independently", () => {
    expect(
      bestOfSets([
        { weight: 100, reps: 3 },
        { weight: 80, reps: 10 },
      ])
    ).toEqual({ maxWeight: 100, maxReps: 10, estimatedOneRepMax: 110 });
  });
});

describe("detectPR", () => {
  const previous = { maxWeight: 60, maxReps: 8, estimatedOneRepMax: 76 };

  it("treats the first time doing an exercise as a record", () => {
    const result = detectPR(null, [{ weight: 60, reps: 8 }]);
    expect(result.isNewRecord).toBe(true);
    expect(result.improved).toEqual(["maxWeight", "maxReps", "estimatedOneRepMax"]);
    expect(result.record).toEqual(previous);
  });

  it("is not a record when nothing improves", () => {
    const result = detectPR(previous, [{ weight: 60, reps: 8 }, { weight: 55, reps: 8 }]);
    expect(result.isNewRecord).toBe(false);
    expect(result.improved).toEqual([]);
    expect(result.record).toEqual(previous);
  });

  it("reports only the metrics that improved and keeps the best of both", () => {
    const result = detectPR(previous, [{ weight: 62.5, reps: 5 }]);
    expect(result.improved).toEqual(["maxWeight"]);
    expect(result.record).toEqual({ maxWeight: 62.5, maxReps: 8, estimatedOneRepMax: 76 });
  });

  it("handles bodyweight exercises through maxReps", () => {
    const result = detectPR(null, [{ weight: 0, reps: 12 }]);
    expect(result.improved).toEqual(["maxReps"]);
  });

  it("ignores incomplete sets", () => {
    const result = detectPR(previous, [{ weight: 200, reps: 1, completed: false }]);
    expect(result.isNewRecord).toBe(false);
  });
});
