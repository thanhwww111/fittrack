import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { env } from "../src/config/env";
import { ExerciseModel } from "../src/models/exercise.model";
import { PushDeviceModel } from "../src/models/pushDevice.model";
import { UserProfileModel } from "../src/models/userProfile.model";
import { WorkoutSessionModel } from "../src/models/workoutSession.model";
import { seedExercises } from "../src/scripts/seedExercises";
import { crossedGoal } from "../src/services/bodyMeasurement.service";
import { pushClient } from "../src/services/push/pushClient";
import { addDays, startOfWeek, todayInTimezone } from "../src/utils/date";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

const TOKEN_A = "ExponentPushToken[device-a]";
const TOKEN_B = "ExponentPushToken[device-b]";
const CRON_SECRET = "cron-secret-for-tests-at-least-32-chars";

let sendSpy: ReturnType<typeof vi.spyOn<typeof pushClient, "send">>;

beforeEach(async () => {
  await seedExercises();
  sendSpy = vi.spyOn(pushClient, "send").mockResolvedValue({ sent: 1, invalidTokens: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  env.CRON_SECRET = undefined;
});

async function userWithDevice(token = TOKEN_A) {
  const user = await createAuthedUser();
  await request(app)
    .post("/api/notifications/devices")
    .set(user.auth)
    .send({ token, platform: "android" });
  return user;
}

describe("notification settings", () => {
  it("returns defaults on first read", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).get("/api/notifications/settings").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      workoutReminder: { enabled: false, days: [1, 3, 5], time: "18:00" },
      mealReminders: { enabled: false, breakfast: "07:30" },
      weeklyReport: true,
      prAlerts: true,
    });
  });

  it("merges partial updates and dedupes/sorts days", async () => {
    const { auth } = await createAuthedUser();
    await request(app)
      .put("/api/notifications/settings")
      .set(auth)
      .send({ workoutReminder: { enabled: true, days: [5, 1, 5, 3] } });
    const res = await request(app)
      .put("/api/notifications/settings")
      .set(auth)
      .send({ workoutReminder: { time: "06:30" }, prAlerts: false });

    expect(res.body.data.workoutReminder).toEqual({ enabled: true, days: [1, 3, 5], time: "06:30" });
    expect(res.body.data.prAlerts).toBe(false);
  });

  it("rejects invalid times and days", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .put("/api/notifications/settings")
      .set(auth)
      .send({ workoutReminder: { time: "25:00", days: [7] } });
    expect(res.status).toBe(400);
  });
});

describe("push devices", () => {
  it("rejects tokens that are not Expo push tokens", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .post("/api/notifications/devices")
      .set(auth)
      .send({ token: "fcm-raw-token", platform: "android" });
    expect(res.status).toBe(400);
  });

  it("moves a token to the user who logged in last on that device", async () => {
    const alice = await userWithDevice();
    const bob = await userWithDevice();

    const device = await PushDeviceModel.findOne({ token: TOKEN_A });
    expect(String(device!.userId)).toBe(bob.userId);
    expect(await PushDeviceModel.countDocuments({ userId: alice.userId })).toBe(0);
  });

  it("only removes the caller's own device", async () => {
    await userWithDevice(TOKEN_A);
    const bob = await createAuthedUser();

    await request(app).delete("/api/notifications/devices").set(bob.auth).send({ token: TOKEN_A });
    expect(await PushDeviceModel.countDocuments({ token: TOKEN_A })).toBe(1);
  });
});

describe("event pushes", () => {
  it("sends a PR push after completing a workout and prunes dead tokens", async () => {
    const { auth, userId } = await userWithDevice(TOKEN_A);
    await request(app).post("/api/notifications/devices").set(auth).send({ token: TOKEN_B, platform: "ios" });
    sendSpy.mockResolvedValue({ sent: 1, invalidTokens: [TOKEN_B] });

    const bench = await ExerciseModel.findOne({ name: "Bench Press" });
    const start = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Push" });
    const id = start.body.data.id;
    await request(app)
      .post(`/api/workout-sessions/${id}/sets`)
      .set(auth)
      .send({ exerciseId: bench!.id, weight: 60, reps: 8 });
    await request(app).post(`/api/workout-sessions/${id}/complete`).set(auth);

    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1));
    const [tokens, payload] = sendSpy.mock.calls[0];
    expect(tokens.sort()).toEqual([TOKEN_A, TOKEN_B]);
    expect(payload.title).toContain("Kỷ lục mới");
    expect(payload.body).toContain("Bench Press");
    expect(payload.data?.url).toBe(`/workout/session?id=${id}`);

    await vi.waitFor(async () =>
      expect(await PushDeviceModel.countDocuments({ userId })).toBe(1)
    );
  });

  it("respects the prAlerts setting", async () => {
    const { auth } = await userWithDevice();
    await request(app).put("/api/notifications/settings").set(auth).send({ prAlerts: false });

    const bench = await ExerciseModel.findOne({ name: "Bench Press" });
    const start = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Push" });
    const id = start.body.data.id;
    await request(app)
      .post(`/api/workout-sessions/${id}/sets`)
      .set(auth)
      .send({ exerciseId: bench!.id, weight: 60, reps: 8 });
    const done = await request(app).post(`/api/workout-sessions/${id}/complete`).set(auth);

    expect(done.status).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("a failing push never breaks the request", async () => {
    const { auth } = await userWithDevice();
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendSpy.mockRejectedValue(new Error("Expo is down"));

    const bench = await ExerciseModel.findOne({ name: "Bench Press" });
    const start = await request(app).post("/api/workout-sessions").set(auth).send({ name: "Push" });
    const id = start.body.data.id;
    await request(app)
      .post(`/api/workout-sessions/${id}/sets`)
      .set(auth)
      .send({ exerciseId: bench!.id, weight: 60, reps: 8 });
    const done = await request(app).post(`/api/workout-sessions/${id}/complete`).set(auth);

    expect(done.status).toBe(200);
    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalled());
  });

  it("sends a goal push only when the goal weight is first crossed", async () => {
    const { auth } = await userWithDevice();
    const today = todayInTimezone("Asia/Ho_Chi_Minh");
    await request(app)
      .put("/api/profile")
      .set(auth)
      .send({ currentWeight: 70, goalType: "WEIGHT_LOSS", goalWeight: 65 });

    await request(app).post("/api/body-measurements").set(auth).send({ weight: 67, date: addDays(today, -2) });
    await request(app).post("/api/body-measurements").set(auth).send({ weight: 64.8, date: addDays(today, -1) });
    await request(app).post("/api/body-measurements").set(auth).send({ weight: 64.5 });

    await vi.waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1));
    expect(sendSpy.mock.calls[0][1].title).toContain("mục tiêu");
  });
});

describe("crossedGoal", () => {
  it("fires only on the crossing measurement", () => {
    expect(crossedGoal("WEIGHT_LOSS", 65, 66, 64.9)).toBe(true);
    expect(crossedGoal("WEIGHT_LOSS", 65, 64.9, 64.5)).toBe(false);
    expect(crossedGoal("WEIGHT_LOSS", 65, null, 64)).toBe(true);
    expect(crossedGoal("MUSCLE_GAIN", 60, 59.5, 60)).toBe(true);
    expect(crossedGoal("MUSCLE_GAIN", 60, 58, 59)).toBe(false);
    expect(crossedGoal("MAINTENANCE", 60, 58, 60)).toBe(false);
    expect(crossedGoal("WEIGHT_LOSS", null, 70, 60)).toBe(false);
  });
});

describe("POST /api/internal/weekly-report", () => {
  it("is hidden when CRON_SECRET is not configured", async () => {
    const res = await request(app).post("/api/internal/weekly-report");
    expect(res.status).toBe(404);
  });

  it("rejects a wrong secret", async () => {
    env.CRON_SECRET = CRON_SECRET;
    const res = await request(app)
      .post("/api/internal/weekly-report")
      .set("Authorization", "Bearer wrong-secret");
    expect(res.status).toBe(401);
  });

  it("summarises last week for active users and skips idle ones", async () => {
    env.CRON_SECRET = CRON_SECRET;
    const active = await userWithDevice(TOKEN_A);
    await userWithDevice(TOKEN_B); // không có hoạt động tuần trước

    const lastWeek = addDays(startOfWeek(todayInTimezone("Asia/Ho_Chi_Minh")), -5);
    const bench = await ExerciseModel.findOne({ name: "Bench Press" });
    const at = new Date(`${lastWeek}T05:00:00Z`);
    await WorkoutSessionModel.create({
      userId: active.userId,
      name: "Push",
      status: "COMPLETED",
      startedAt: at,
      completedAt: at,
      totalVolume: 4820,
      exercises: [
        { exerciseId: bench!._id, exerciseName: "Bench Press", sets: [{ setNumber: 1, weight: 60, reps: 8 }] },
      ],
    });

    const res = await request(app)
      .post("/api/internal/weekly-report")
      .set("Authorization", `Bearer ${CRON_SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ users: 2, skipped: 1, sent: 1 });
    const [tokens, payload] = sendSpy.mock.calls[0];
    expect(tokens).toEqual([TOKEN_A]);
    expect(payload.body).toContain("1 buổi tập, 4820 kg volume");
  });

  it("reports sessions against the weekly plan and the volume change", async () => {
    env.CRON_SECRET = CRON_SECRET;
    const active = await userWithDevice(TOKEN_A);
    await UserProfileModel.updateOne({ userId: active.userId }, { trainingDaysPerWeek: 4 });

    const weekStart = startOfWeek(todayInTimezone("Asia/Ho_Chi_Minh"));
    const bench = await ExerciseModel.findOne({ name: "Bench Press" });
    // Thứ Tư tuần trước và thứ Tư hai tuần trước
    for (const [date, totalVolume] of [
      [addDays(weekStart, -5), 4820],
      [addDays(weekStart, -12), 2410],
    ] as const) {
      const at = new Date(`${date}T05:00:00Z`);
      await WorkoutSessionModel.create({
        userId: active.userId,
        name: "Push",
        status: "COMPLETED",
        startedAt: at,
        completedAt: at,
        totalVolume,
        exercises: [
          { exerciseId: bench!._id, exerciseName: "Bench Press", sets: [{ setNumber: 1, weight: 60, reps: 8 }] },
        ],
      });
    }

    await request(app)
      .post("/api/internal/weekly-report")
      .set("Authorization", `Bearer ${CRON_SECRET}`);

    const [, payload] = sendSpy.mock.calls[0];
    expect(payload.body).toContain("1/4 buổi tập, 4820 kg volume (+100% so tuần trước)");
  });
});
