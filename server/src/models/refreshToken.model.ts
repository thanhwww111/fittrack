import { Schema, model, type InferSchemaType } from "mongoose";

// Mỗi refresh token đang còn hiệu lực là một document.
// Chỉ lưu SHA-256 của token, lộ DB cũng không dùng được token.
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jti: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

refreshTokenSchema.index({ userId: 1 });
// MongoDB tự xoá token khi hết hạn
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;

export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema);
