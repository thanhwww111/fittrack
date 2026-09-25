import { Schema, model, type InferSchemaType } from "mongoose";
import { MEAL_TYPES, SERVING_UNITS } from "../constants/enums";
import { DATE_REGEX } from "../utils/date";
import { applyToJSON } from "../utils/toJSON";

// Snapshot dinh dưỡng tại thời điểm log: sửa/xoá Food sau này không làm đổi lịch sử.
// Các giá trị này do backend tính từ Food + quantity, không nhận từ client.
const foodLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: DATE_REGEX }, // YYYY-MM-DD theo giờ của user
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    foodId: { type: Schema.Types.ObjectId, ref: "Food", required: true },
    foodName: { type: String, required: true },
    servingUnit: { type: String, enum: SERVING_UNITS, required: true },
    quantity: { type: Number, required: true, min: 0.01 }, // cùng đơn vị với servingUnit
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

foodLogSchema.index({ userId: 1, date: 1 });

applyToJSON(foodLogSchema);

export type FoodLog = InferSchemaType<typeof foodLogSchema>;

export const FoodLogModel = model("FoodLog", foodLogSchema);
