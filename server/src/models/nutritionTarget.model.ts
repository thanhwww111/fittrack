import { Schema, model, type InferSchemaType } from "mongoose";
import { TARGET_SOURCES } from "../constants/enums";
import { DATE_REGEX } from "../utils/date";
import { applyToJSON } from "../utils/toJSON";

// Không sửa target cũ: mỗi lần đổi tạo bản ghi mới để giữ lịch sử.
// Target áp dụng cho ngày D = bản ghi có effectiveFrom <= D mới nhất.
const nutritionTargetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: String, required: true, match: DATE_REGEX }, // YYYY-MM-DD
    source: { type: String, enum: TARGET_SOURCES, required: true },
  },
  { timestamps: true }
);

// Mỗi ngày tối đa một target, so sánh chuỗi YYYY-MM-DD cũng đúng thứ tự thời gian
nutritionTargetSchema.index({ userId: 1, effectiveFrom: -1 }, { unique: true });

applyToJSON(nutritionTargetSchema);

export type NutritionTarget = InferSchemaType<typeof nutritionTargetSchema>;

export const NutritionTargetModel = model("NutritionTarget", nutritionTargetSchema);
