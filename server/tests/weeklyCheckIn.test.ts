import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { BodyMeasurementModel } from "../src/models/bodyMeasurement.model";
import { UserProfileModel } from "../src/models/userProfile.model";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";
import { signAccessToken } from "../src/utils/tokens";

useTestDatabase();
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const endpoint = "/api/profile/weekly-check-in";
function at(iso: string) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(iso)); }

describe("weekly measurement check-in", () => {
  it("does not mark completion when the final profile write fails and safely retries", async () => {
    const { auth, userId } = await createAuthedUser();
    const write = vi.spyOn(UserProfileModel, "findOneAndUpdate").mockRejectedValueOnce(new Error("temporary write failure"));
    const failed = await request(app).post(endpoint).set(auth).send({ weight: 70, height: 170 });
    expect(failed.status).toBe(500);
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(true);
    write.mockRestore();
    expect((await request(app).post(endpoint).set(auth).send({ weight: 70, height: 170 })).status).toBe(200);
    expect(await BodyMeasurementModel.countDocuments({ userId })).toBe(1);
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(false);
  });
  it("requires login and both valid measurements", async () => {
    expect((await request(app).get(endpoint)).status).toBe(401);
    const { auth } = await createAuthedUser();
    for (const body of [{ weight: 70 }, { height: 170 }, { weight: 10, height: 170 }, { weight: 70, height: 400 }]) {
      expect((await request(app).post(endpoint).set(auth).send(body)).status).toBe(400);
    }
  });
  it("is due at Monday midnight in the profile timezone and catches up later in the week", async () => {
    at("2026-10-04T16:59:00Z");
    const { auth, userId } = await createAuthedUser();
    await UserProfileModel.updateOne({ userId }, { height: 170, currentWeight: 70, measurementsConfirmedAt: new Date("2026-10-01T03:00:00Z") });
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(false);
    vi.setSystemTime(new Date("2026-10-04T17:00:00Z"));
    expect((await request(app).get(endpoint).set(auth)).body.data).toMatchObject({ required: true, weekStart: "2026-10-05", today: "2026-10-05" });
    vi.setSystemTime(new Date("2026-10-07T06:00:00Z"));
    auth.Authorization = `Bearer ${signAccessToken(userId)}`;
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(true);
  });
  it("counts first onboarding measurements for the current week, not edits to unrelated fields", async () => {
    at("2026-10-05T03:00:00Z");
    const { auth, userId } = await createAuthedUser();
    await request(app).put("/api/profile").set(auth).send({ currentWeight: 70, height: 170 });
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(false);
    vi.setSystemTime(new Date("2026-10-12T03:00:00Z"));
    auth.Authorization = `Bearer ${signAccessToken(userId)}`;
    await request(app).put("/api/profile").set(auth).send({ age: 30 });
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(true);
  });
  it("stores height and weight without erasing same-day measurements, resets next Monday and isolates users", async () => {
    at("2026-10-05T03:00:00Z");
    const { auth, userId } = await createAuthedUser();
    const other = await createAuthedUser();
    await UserProfileModel.updateOne({ userId }, { currentWeight: 70, height: 170, goalType: "WEIGHT_LOSS", goalWeight: 65, startWeight: 75 });
    await BodyMeasurementModel.create({ userId, date: "2026-10-05", weight: 70, waist: 80, chest: 90 });
    const saved = await request(app).post(endpoint).set(auth).send({ weight: 64, height: 171 });
    expect(saved.status).toBe(200);
    expect(saved.body.data.status.required).toBe(false);
    expect(saved.body.data.profile).toMatchObject({ currentWeight: 64, height: 171, startWeight: 75 });
    const repeated = await request(app).post(endpoint).set(auth).send({ weight: 64, height: 171 });
    expect(repeated.status).toBe(200);
    expect(await BodyMeasurementModel.countDocuments({ userId })).toBe(1);
    expect(await BodyMeasurementModel.findOne({ userId }).lean()).toMatchObject({ weight: 64, height: 171, waist: 80, chest: 90 });
    expect((await request(app).get(endpoint).set(other.auth)).body.data.required).toBe(true);
    vi.setSystemTime(new Date("2026-10-12T03:00:00Z"));
    auth.Authorization = `Bearer ${signAccessToken(userId)}`;
    expect((await request(app).get(endpoint).set(auth)).body.data.required).toBe(true);
  });
});
