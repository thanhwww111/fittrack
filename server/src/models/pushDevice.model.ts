import { Schema, model, type InferSchemaType } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

// Một thiết bị nhận push. Token là của máy, không phải của user:
// đăng nhập tài khoản khác trên cùng máy thì token chuyển sang user mới.
const pushDeviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["ios", "android"], required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pushDeviceSchema.index({ userId: 1 });

applyToJSON(pushDeviceSchema);

export type PushDevice = InferSchemaType<typeof pushDeviceSchema>;

export const PushDeviceModel = model("PushDevice", pushDeviceSchema);
