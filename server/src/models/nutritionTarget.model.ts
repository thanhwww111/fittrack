import { Schema, model, type InferSchemaType } from "mongoose";

// Không sửa target cũ: mỗi lần đổi tạo bản ghi mới để giữ lịch sử.
// Target đang áp dụng cho ngày D = bản ghi có effectiveFrom <= D mới nhất.
const nutritionTargetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

nutritionTargetSchema.index({ userId: 1, effectiveFrom: -1 });

export type NutritionTarget = InferSchemaType<typeof nutritionTargetSchema>;

export const NutritionTargetModel = model("NutritionTarget", nutritionTargetSchema);
