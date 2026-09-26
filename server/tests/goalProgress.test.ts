import { describe, expect, it } from "vitest";
import {
  actualWeeklyRate,
  goalProgressPercent,
  rateStatus,
  targetWeeklyRate,
  weeklyAverages,
} from "../src/utils/goalProgress";

describe("targetWeeklyRate", () => {
  it("is signed by goal type and falls back to a sensible default", () => {
    expect(targetWeeklyRate("MUSCLE_GAIN", null)).toBe(0.25);
    expect(targetWeeklyRate("MUSCLE_GAIN", 0.4)).toBe(0.4);
    expect(targetWeeklyRate("WEIGHT_LOSS", null)).toBe(-0.5);
    expect(targetWeeklyRate("WEIGHT_LOSS", 0.3)).toBe(-0.3);
    expect(targetWeeklyRate("MAINTENANCE", 0.3)).toBe(0);
  });
});

describe("goalProgressPercent", () => {
  it("measures the share of the distance already covered", () => {
    expect(goalProgressPercent(54, 55.8, 60)).toBe(30);
    expect(goalProgressPercent(80, 75, 70)).toBe(50);
  });

  it("clamps between 0 and 100", () => {
    expect(goalProgressPercent(54, 53, 60)).toBe(0);
    expect(goalProgressPercent(54, 61, 60)).toBe(100);
  });

  it("is null when start and goal are the same", () => {
    expect(goalProgressPercent(60, 60, 60)).toBeNull();
  });
});

describe("weeklyAverages", () => {
  it("averages each Monday-based week and the change from the previous week with data", () => {
    const weeks = weeklyAverages(
      [
        { date: "2026-09-07", weight: 54 },
        { date: "2026-09-09", weight: 54.4 },
        { date: "2026-09-22", weight: 54.9 },
        { date: "2026-09-24", weight: 55.1 },
      ],
      ["2026-09-07", "2026-09-14", "2026-09-21"]
    );
    expect(weeks).toEqual([
      { weekStart: "2026-09-07", average: 54.2, entries: 2, change: null },
      { weekStart: "2026-09-14", average: null, entries: 0, change: null },
      { weekStart: "2026-09-21", average: 55, entries: 2, change: 0.8 },
    ]);
  });
});

describe("actualWeeklyRate", () => {
  const week = (weekStart: string, average: number | null) => ({ weekStart, average, entries: 1, change: null });

  it("is the slope between the first and last averaged weeks", () => {
    expect(
      actualWeeklyRate([week("2026-09-07", 54), week("2026-09-14", null), week("2026-09-21", 54.6)])
    ).toBe(0.3);
  });

  it("needs at least two weeks with data", () => {
    expect(actualWeeklyRate([week("2026-09-14", null), week("2026-09-21", 54.6)])).toBeNull();
  });
});

describe("rateStatus", () => {
  it("compares the actual trend with the target rate", () => {
    expect(rateStatus(0.25, 0.25)).toBe("ON_TRACK");
    expect(rateStatus(0.25, 0.1)).toBe("TOO_SLOW");
    expect(rateStatus(0.25, 0.5)).toBe("TOO_FAST");
    expect(rateStatus(0.25, -0.2)).toBe("WRONG_DIRECTION");
    expect(rateStatus(-0.5, -0.45)).toBe("ON_TRACK");
    expect(rateStatus(0.25, null)).toBe("NOT_ENOUGH_DATA");
  });

  it("expects a stable weight when maintaining", () => {
    expect(rateStatus(0, 0.1)).toBe("ON_TRACK");
    expect(rateStatus(0, -0.4)).toBe("OFF_TRACK");
  });
});
