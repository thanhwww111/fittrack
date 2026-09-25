import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

describe("GET /api/profile", () => {
  it("returns the empty profile created on register", async () => {
    const { auth, userId } = await createAuthedUser();
    const res = await request(app).get("/api/profile").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      userId,
      gender: null,
      goalType: null,
      timezone: "Asia/Ho_Chi_Minh",
    });
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/profile", () => {
  it("partially updates the profile", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .put("/api/profile")
      .set(auth)
      .send({ gender: "MALE", age: 21, currentWeight: 54, goalType: "MUSCLE_GAIN", goalWeight: 60 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ gender: "MALE", age: 21, currentWeight: 54, goalWeight: 60 });

    const second = await request(app).put("/api/profile").set(auth).send({ height: 170 });
    expect(second.body.data).toMatchObject({ height: 170, currentWeight: 54 });
  });

  it("rejects invalid values", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app)
      .put("/api/profile")
      .set(auth)
      .send({ currentWeight: -20, age: 5, gender: "ROBOT", timezone: "Mars/Base" });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["currentWeight", "age", "gender", "timezone"]));
  });

  it("rejects an empty body", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).put("/api/profile").set(auth).send({});
    expect(res.status).toBe(400);
  });

  it("ignores fields that are not part of the profile", async () => {
    const { auth, userId } = await createAuthedUser();
    const res = await request(app)
      .put("/api/profile")
      .set(auth)
      .send({ age: 30, userId: "000000000000000000000000" });

    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(userId);
  });

  it("rejects goalWeight that contradicts goalType", async () => {
    const { auth } = await createAuthedUser();
    const loss = await request(app)
      .put("/api/profile")
      .set(auth)
      .send({ currentWeight: 70, goalType: "WEIGHT_LOSS", goalWeight: 75 });
    expect(loss.status).toBe(400);

    // Kiểm tra cả khi chỉ gửi một phần, kết hợp với giá trị đang lưu
    await request(app).put("/api/profile").set(auth).send({ currentWeight: 54, goalType: "MUSCLE_GAIN" });
    const gain = await request(app).put("/api/profile").set(auth).send({ goalWeight: 50 });
    expect(gain.status).toBe(400);
  });
});
