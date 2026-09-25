import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { FoodModel } from "../src/models/food.model";
import { UserModel } from "../src/models/user.model";
import { UserProfileModel } from "../src/models/userProfile.model";
import { WaterLogModel } from "../src/models/waterLog.model";
import { createAuthedUser } from "./helpers/auth";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

async function registerUser() {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "An", email: "an@example.com", password: "password123" });
  return {
    auth: { Authorization: `Bearer ${res.body.data.accessToken}` },
    refreshToken: res.body.data.refreshToken as string,
    userId: res.body.data.user.id as string,
  };
}

describe("PATCH /api/auth/me", () => {
  it("renames the user", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).patch("/api/auth/me").set(auth).send({ name: "  Bình  " });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Bình");
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("rejects an empty name", async () => {
    const { auth } = await createAuthedUser();
    const res = await request(app).patch("/api/auth/me").set(auth).send({ name: "  " });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/change-password", () => {
  it("changes the password, revokes old sessions and returns new tokens", async () => {
    const { auth, refreshToken } = await registerUser();

    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth)
      .send({ currentPassword: "password123", newPassword: "newpassword456" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();

    // Refresh token cũ không còn dùng được
    const oldRefresh = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(oldRefresh.status).toBe(401);

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "password123" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "newpassword456" });
    expect(newLogin.status).toBe(200);
  });

  it("returns a field error when the current password is wrong", async () => {
    const { auth } = await registerUser();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth)
      .send({ currentPassword: "wrong-password", newPassword: "newpassword456" });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe("currentPassword");
  });

  it("rejects a new password that is too short or unchanged", async () => {
    const { auth } = await registerUser();
    for (const newPassword of ["short", "password123"]) {
      const res = await request(app)
        .post("/api/auth/change-password")
        .set(auth)
        .send({ currentPassword: "password123", newPassword });
      expect(res.status).toBe(400);
    }
  });
});

describe("DELETE /api/auth/me", () => {
  it("requires the correct password", async () => {
    const { auth, userId } = await registerUser();
    const res = await request(app).delete("/api/auth/me").set(auth).send({ password: "nope" });
    expect(res.status).toBe(400);
    expect(await UserModel.exists({ _id: userId })).toBeTruthy();
  });

  it("deletes the user and their data but not other users' data", async () => {
    const { auth, userId } = await registerUser();
    const other = await createAuthedUser();

    await request(app).post("/api/water/add").set(auth).send({ amount: 250 });
    await request(app).post("/api/water/add").set(other.auth).send({ amount: 250 });
    await request(app).post("/api/foods").set(auth).send({
      name: "Món riêng",
      servingSize: 100,
      servingUnit: "g",
      calories: 100,
      protein: 1,
      carbs: 1,
      fat: 1,
    });

    const res = await request(app).delete("/api/auth/me").set(auth).send({ password: "password123" });
    expect(res.status).toBe(204);

    expect(await UserModel.exists({ _id: userId })).toBeNull();
    expect(await UserProfileModel.exists({ userId })).toBeNull();
    expect(await FoodModel.exists({ createdBy: userId })).toBeNull();
    expect(await WaterLogModel.countDocuments()).toBe(1);

    // Access token còn hạn nhưng user đã bị xoá
    const me = await request(app).get("/api/auth/me").set(auth);
    expect(me.status).toBe(401);
  });
});

describe("avatar", () => {
  const tinyJpeg = `data:image/jpeg;base64,${Buffer.from("fake-jpeg-bytes").toString("base64")}`;

  it("sets and removes the avatar", async () => {
    const { auth } = await createAuthedUser();
    const set = await request(app).patch("/api/auth/me").set(auth).send({ avatar: tinyJpeg });
    expect(set.status).toBe(200);
    expect(set.body.data.avatar).toBe(tinyJpeg);

    const removed = await request(app).patch("/api/auth/me").set(auth).send({ avatar: null });
    expect(removed.body.data.avatar).toBeNull();
  });

  it("rejects non-image data and oversized images", async () => {
    const { auth } = await createAuthedUser();
    for (const avatar of ["https://evil.example/x.png", "data:text/html;base64,PGgxPg==", `data:image/png;base64,${"A".repeat(200_000)}`]) {
      const res = await request(app).patch("/api/auth/me").set(auth).send({ avatar });
      expect(res.status).toBe(400);
    }
  });
});

describe("access tokens after security events", () => {
  it("rejects old access tokens after a password change but accepts the new one", async () => {
    const { auth } = await registerUser();
    // iat của JWT tính theo giây: đợi sang giây mới để token cũ chắc chắn cũ hơn mốc đổi mật khẩu
    await new Promise((r) => setTimeout(r, 1100));

    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth)
      .send({ currentPassword: "password123", newPassword: "newpassword456" });
    expect(res.status).toBe(200);

    expect((await request(app).get("/api/water").set(auth)).status).toBe(401);
    const fresh = { Authorization: `Bearer ${res.body.data.accessToken}` };
    expect((await request(app).get("/api/water").set(fresh)).status).toBe(200);
  });

  it("rejects tokens of a deleted account on every route", async () => {
    const { auth } = await registerUser();
    await request(app).delete("/api/auth/me").set(auth).send({ password: "password123" });
    const res = await request(app).post("/api/water/add").set(auth).send({ amount: 250 });
    expect(res.status).toBe(401);
    expect(await WaterLogModel.countDocuments()).toBe(0);
  });
});
