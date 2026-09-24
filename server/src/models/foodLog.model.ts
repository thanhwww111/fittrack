import { Schema, model, type InferSchemaType } from "mongoose";
import { MEAL_TYPES } from "../constants/enums";

// Snapshot dinh dưỡng tại thời điểm log: sửa Food sau này không làm đổi lịch sử.
// Các giá trị này do backend tính từ Food + quantity, không nhận từ client.
const foodLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD theo giờ của user
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
    foodName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.01 }, // cùng đơn vị với Food.servingUnit
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

foodLogSchema.index({ userId: 1, date: 1 });

export type FoodLog = InferSchemaType<typeof foodLogSchema>;

export const FoodLogModel = model("FoodLog", foodLogSchema);
