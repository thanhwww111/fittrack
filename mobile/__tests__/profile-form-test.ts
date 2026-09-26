import { isProfileComplete, parseProfileNumbers } from "@/lib/profileForm";
import type { UserProfile } from "@/types/models";

const complete: UserProfile = {
  id: "p",
  userId: "u",
  gender: "MALE",
  age: 22,
  height: 170,
  currentWeight: 60,
  activityLevel: "MODERATE",
  goalType: "MUSCLE_GAIN",
  goalWeight: null,
  trainingDaysPerWeek: null,
  startWeight: null,
  goalStartDate: null,
  goalRate: null,
  timezone: "Asia/Ho_Chi_Minh",
  updatedAt: "2026-09-26T00:00:00.000Z",
};

describe("isProfileComplete", () => {
  it("needs every field used to compute the nutrition target", () => {
    expect(isProfileComplete(complete)).toBe(true);
    expect(isProfileComplete({ ...complete, height: null })).toBe(false);
    expect(isProfileComplete({ ...complete, goalType: null })).toBe(false);
  });

  it("does not require the optional goal fields", () => {
    expect(isProfileComplete({ ...complete, goalWeight: null, goalRate: null })).toBe(true);
  });
});

describe("parseProfileNumbers", () => {
  it("parses the requested fields and reports range errors", () => {
    const { input, errors } = parseProfileNumbers(
      { age: "22", height: "170,5", currentWeight: "600" },
      ["age", "height", "currentWeight"]
    );
    expect(input).toEqual({ age: 22, height: 170.5 });
    expect(errors).toEqual({ currentWeight: "Nhập từ 20 đến 500" });
  });

  it("marks required fields that are left empty", () => {
    const { errors } = parseProfileNumbers({ age: "", height: "1.5" }, ["age", "height"], ["age"]);
    expect(errors).toEqual({ age: "Bắt buộc", height: "Nhập từ 50 đến 300" });
  });

  it("rejects decimals for integer fields", () => {
    const { errors } = parseProfileNumbers({ age: "21.5" }, ["age"]);
    expect(errors).toEqual({ age: "Phải là số nguyên" });
  });
});
