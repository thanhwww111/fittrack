import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { env } from "../config/env";
import { PasswordResetModel } from "../models/passwordReset.model";
import { RefreshTokenModel } from "../models/refreshToken.model";
import { UserModel } from "../models/user.model";
import type { ForgotPasswordInput, ResetPasswordInput } from "../schemas/auth.schema";
import { AppError } from "../utils/AppError";
import { hashToken } from "../utils/tokens";
import { issueSession } from "./auth.service";
import { sendMail } from "./mail.service";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
// Một email chỉ nhận mã mới sau mỗi 60 giây, chặn việc spam hộp thư người khác
const RESEND_COOLDOWN_MS = 60 * 1000;

function invalidCode() {
  return AppError.badRequest("Invalid or expired code", [
    { path: "code", message: "Invalid or expired code" },
  ]);
}

// Luôn trả về thành công dù email có tồn tại hay không, để không lộ email nào đã đăng ký
export async function requestPasswordReset({ email }: ForgotPasswordInput) {
  const user = await UserModel.findOne({ email });
  if (!user) return;

  const existing = await PasswordResetModel.findOne({ userId: user._id }).select("sentAt").lean();
  if (existing && Date.now() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) return;

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await PasswordResetModel.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        codeHash: hashToken(code),
        attempts: 0,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
        sentAt: new Date(),
      },
    },
    { upsert: true }
  );

  // Không chờ gửi mail: thời gian phản hồi giống trường hợp email không tồn tại
  void sendMail({
    to: user.email,
    subject: `Mã đặt lại mật khẩu FitTrack: ${code}`,
    text:
      `Xin chào ${user.name},\n\n` +
      `Mã đặt lại mật khẩu của bạn là: ${code}\n` +
      `Mã có hiệu lực trong ${CODE_TTL_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.\n\n` +
      `FitTrack`,
  }).catch((err) => console.error("✉️  Failed to send reset email:", err));
}

// Đúng mã thì đổi mật khẩu, thu hồi mọi phiên cũ và đăng nhập luôn trên máy này
export async function resetPassword({ email, code, newPassword }: ResetPasswordInput) {
  const user = await UserModel.findOne({ email }).select("+passwordHash");
  if (!user) throw invalidCode();

  const reset = await PasswordResetModel.findOne({ userId: user._id });
  if (!reset || reset.expiresAt.getTime() < Date.now()) throw invalidCode();

  const expected = Buffer.from(reset.codeHash, "hex");
  const actual = Buffer.from(hashToken(code), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    // Sai quá số lần cho phép thì huỷ mã, phải yêu cầu mã mới
    reset.attempts += 1;
    if (reset.attempts >= MAX_ATTEMPTS) await reset.deleteOne();
    else await reset.save();
    throw invalidCode();
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  user.set("passwordChangedAt", new Date(Math.floor(Date.now() / 1000) * 1000));
  await user.save();
  await Promise.all([reset.deleteOne(), RefreshTokenModel.deleteMany({ userId: user._id })]);

  return issueSession(user);
}
