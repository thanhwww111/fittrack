import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { PasswordResetModel } from "../src/models/passwordReset.model";
import * as mail from "../src/services/mail.service";
import { useTestDatabase } from "./helpers/db";

useTestDatabase();

afterEach(() => {
  vi.restoreAllMocks();
});

// Bắt email gửi đi để lấy mã 6 số
function captureMail() {
  const sent: mail.MailMessage[] = [];
  vi.spyOn(mail, "sendMail").mockImplementation(async (message) => {
    sent.push(message);
  });
  return {
    sent,
    code: () => sent.at(-1)!.text.match(/\b(\d{6})\b/)![1],
  };
}

async function registerUser() {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "An", email: "an@example.com", password: "password123" });
  return { refreshToken: res.body.data.refreshToken as string };
}

describe("POST /api/auth/forgot-password", () => {
  it("emails a 6-digit code to a registered user", async () => {
    await registerUser();
    const mailbox = captureMail();

    const res = await request(app).post("/api/auth/forgot-password").send({ email: "AN@example.com" });
    expect(res.status).toBe(200);
    expect(mailbox.sent).toHaveLength(1);
    expect(mailbox.sent[0].to).toBe("an@example.com");
    expect(mailbox.code()).toMatch(/^\d{6}$/);
  });

  it("responds the same for unknown emails without sending anything", async () => {
    const mailbox = captureMail();
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(mailbox.sent).toHaveLength(0);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("resets the password with the right code, logs in and revokes old sessions", async () => {
    const { refreshToken } = await registerUser();
    const mailbox = captureMail();
    await request(app).post("/api/auth/forgot-password").send({ email: "an@example.com" });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "an@example.com", code: mailbox.code(), newPassword: "brandnew123" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();

    expect((await request(app).post("/api/auth/refresh").send({ refreshToken })).status).toBe(401);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "an@example.com", password: "brandnew123" });
    expect(login.status).toBe(200);

    // Mã chỉ dùng được một lần
    const reuse = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "an@example.com", code: mailbox.code(), newPassword: "another123" });
    expect(reuse.status).toBe(400);
  });

  it("rejects a wrong code and invalidates it after 5 attempts", async () => {
    await registerUser();
    const mailbox = captureMail();
    await request(app).post("/api/auth/forgot-password").send({ email: "an@example.com" });
    const right = mailbox.code();
    const wrong = right === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ email: "an@example.com", code: wrong, newPassword: "brandnew123" });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe("code");
    }
    expect(await PasswordResetModel.countDocuments()).toBe(0);

    const late = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "an@example.com", code: right, newPassword: "brandnew123" });
    expect(late.status).toBe(400);
  });

  it("rejects an expired code", async () => {
    await registerUser();
    const mailbox = captureMail();
    await request(app).post("/api/auth/forgot-password").send({ email: "an@example.com" });
    await PasswordResetModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "an@example.com", code: mailbox.code(), newPassword: "brandnew123" });
    expect(res.status).toBe(400);
  });
});

describe("reset email rate limit", () => {
  it("sends at most one code per minute to the same email", async () => {
    await registerUser();
    const mailbox = captureMail();
    await request(app).post("/api/auth/forgot-password").send({ email: "an@example.com" });
    const again = await request(app).post("/api/auth/forgot-password").send({ email: "an@example.com" });
    expect(again.status).toBe(200);
    expect(mailbox.sent).toHaveLength(1);

    // Hết thời gian chờ thì gửi mã mới
    await PasswordResetModel.updateMany({}, { $set: { sentAt: new Date(Date.now() - 61_000) } });
    await request(app).post("/api/auth/forgot-password").send({ email: "an@example.com" });
    expect(mailbox.sent).toHaveLength(2);
  });
});
