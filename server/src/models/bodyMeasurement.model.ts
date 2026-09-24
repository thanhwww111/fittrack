import { Schema, model, type InferSchemaType } from "mongoose";

// MVP chỉ bắt buộc date + weight, các số đo còn lại là tuỳ chọn
const bodyMeasurementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    weight: { type: Number, required: true, min: 20, max: 500 }, // kg
    bodyFat: { type: Number, min: 1, max: 70, default: null }, // %
    chest: { type: Number, min: 0, default: null }, // cm
    waist: { type: Number, min: 0, default: null },
    arm: { type: Number, min: 0, default: null },
    thigh: { type: Number, min: 0, default: null },
  },
  { timestamps: true }
);

// Mỗi ngày một bản ghi, nhập lại thì cập nhật
bodyMeasurementSchema.index({ userId: 1, date: 1 }, { unique: true });

export type BodyMeasurement = InferSchemaType<typeof bodyMeasurementSchema>;

export const BodyMeasurementModel = model("BodyMeasurement", bodyMeasurementSchema);
