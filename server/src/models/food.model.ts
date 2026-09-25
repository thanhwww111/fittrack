import { Schema, model, type InferSchemaType } from "mongoose";
import { SERVING_UNITS } from "../constants/enums";
import { applyToJSON } from "../utils/toJSON";

// Giá trị dinh dưỡng tính trên 1 khẩu phần (servingSize servingUnit)
const foodSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    servingSize: { type: Number, required: true, min: 0.01 },
    servingUnit: { type: String, enum: SERVING_UNITS, required: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
    // Food hệ thống: isCustom = false, createdBy = null
    isCustom: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// User thấy food hệ thống (createdBy = null) + food của chính mình
foodSchema.index({ createdBy: 1, name: 1 });

applyToJSON(foodSchema);

export type Food = InferSchemaType<typeof foodSchema>;

export const FoodModel = model("Food", foodSchema);
