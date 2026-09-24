import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { UserProfileModel } from "../src/models/userProfile.model";
import { UserModel } from "../src/models/user.model";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

const credentials = { name: "Long", email: "Long@Example.com", password: "password123" };

async function registerUser(body = credentials) {
  return request(app).post("/api/auth/register").send(body);
}

describe("POST /api/auth/register", () => {
  it("creates user + empty profile and returns tokens", async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ name: "Long", email: "long@example.com" });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));

    const user = await UserModel.findOne({ email: "long@example.com" }).select("+passwordHash");
    expect(user?.passwordHash).not.toBe(credentials.password);
    expect(await UserProfileModel.countDocuments({ userId: user?._id })).toBe(1);
  });

  it("rejects duplicate email (case-insensitive)", async () => {
    await registerUser();
    const res = await registerUser({ ...credentials, email: "LONG@example.com" });

    expect(res.status).toBe(409);
  });

  it("rejects invalid body", async () => {
    const res = await registerUser({ name: "", email: "not-an-email", password: "123" });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });
});

describe("POST /api/auth/login", () => {
  it("returns tokens with correct credentials", async () => {
    await registerUser();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "long@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("returns the same 401 for wrong password and unknown email", async () => {
    await registerUser();
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "long@example.com", password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe("GET /api/auth/me", () => {
  it("returns user and profile with a valid access token", async () => {
    const { body } = await registerUser();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("long@example.com");
    expect(res.body.data.profile).not.toBeNull();
  });

  it("rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a refresh token used as access token", async () => {
    const { body } = await registerUser();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${body.data.refreshToken}`);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rotates the refresh token", async () => {
    const { body } = await registerUser();
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: body.data.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).not.toBe(body.data.refreshToken);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });

  it("detects reuse of an old refresh token and revokes all sessions", async () => {
    const { body } = await registerUser();
    const oldToken = body.data.refreshToken;

    const first = await request(app).post("/api/auth/refresh").send({ refreshToken: oldToken });
    const newToken = first.body.data.refreshToken;

    const reuse = await request(app).post("/api/auth/refresh").send({ refreshToken: oldToken });
    expect(reuse.status).toBe(401);

    // Token mới cũng bị thu hồi vì phiên đã bị coi là bị lộ
    const afterReuse = await request(app).post("/api/auth/refresh").send({ refreshToken: newToken });
    expect(afterReuse.status).toBe(401);
  });

  it("rejects a garbage token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "abc" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the refresh token", async () => {
    const { body } = await registerUser();
    const refreshToken = body.data.refreshToken;

    const logout = await request(app).post("/api/auth/logout").send({ refreshToken });
    expect(logout.status).toBe(200);

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });
});
