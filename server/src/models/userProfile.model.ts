import { Schema, model, type InferSchemaType } from "mongoose";
import { ACTIVITY_LEVELS, GENDERS, GOAL_TYPES } from "../constants/enums";
import { DEFAULT_TIMEZONE } from "../utils/date";
import { applyToJSON } from "../utils/toJSON";

// Profile được tạo rỗng lúc register, user điền dần ở màn onboarding
const userProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    gender: { type: String, enum: GENDERS, default: null },
    age: { type: Number, min: 10, max: 120, default: null },
    height: { type: Number, min: 50, max: 300, default: null }, // cm
    currentWeight: { type: Number, min: 20, max: 500, default: null }, // kg
    activityLevel: { type: String, enum: ACTIVITY_LEVELS, default: null },
    goalType: { type: String, enum: GOAL_TYPES, default: null },
    goalWeight: { type: Number, min: 20, max: 500, default: null }, // kg
    trainingDaysPerWeek: { type: Number, min: 0, max: 7, default: null },
    // Dùng để xác định "hôm nay" của user (IANA, ví dụ Asia/Ho_Chi_Minh)
    timezone: { type: String, default: DEFAULT_TIMEZONE },
    // Món ăn yêu thích, mới thêm lên đầu. Đọc qua GET /api/foods/favorites.
    favoriteFoods: { type: [{ type: Schema.Types.ObjectId, ref: "Food" }], default: [] },
  },
  { timestamps: true }
);

applyToJSON(userProfileSchema, ["favoriteFoods"]);

export type UserProfile = InferSchemaType<typeof userProfileSchema>;

export const UserProfileModel = model("UserProfile", userProfileSchema);
