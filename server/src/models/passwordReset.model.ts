import { Schema, model, type InferSchemaType } from "mongoose";

// Mã đặt lại mật khẩu (6 số) gửi qua email. Chỉ lưu SHA-256 của mã, mỗi user một mã đang hiệu lực.
const passwordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // Lần gửi mã gần nhất, dùng để giới hạn tần suất gửi email
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB tự xoá mã khi hết hạn
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordReset = InferSchemaType<typeof passwordResetSchema>;

export const PasswordResetModel = model("PasswordReset", passwordResetSchema);
