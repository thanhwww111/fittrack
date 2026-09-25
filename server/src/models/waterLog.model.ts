import { Schema, model, type InferSchemaType } from "mongoose";
import { DATE_REGEX } from "../utils/date";
import { applyToJSON } from "../utils/toJSON";

// Tổng lượng nước uống trong một ngày (ml), mỗi user một bản ghi / ngày
const waterLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: DATE_REGEX },
    amount: { type: Number, required: true, min: 0, max: 20000 },
  },
  { timestamps: true }
);

waterLogSchema.index({ userId: 1, date: 1 }, { unique: true });

applyToJSON(waterLogSchema);

export type WaterLog = InferSchemaType<typeof waterLogSchema>;

export const WaterLogModel = model("WaterLog", waterLogSchema);
