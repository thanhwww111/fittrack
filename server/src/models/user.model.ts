import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Không bao giờ trả về passwordHash trừ khi query gọi .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    // Access token cấp trước mốc này bị từ chối (đổi / đặt lại mật khẩu thì mọi phiên cũ mất hiệu lực ngay)
    passwordChangedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

applyToJSON(userSchema, ["passwordHash", "passwordChangedAt"]);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model("User", userSchema);
