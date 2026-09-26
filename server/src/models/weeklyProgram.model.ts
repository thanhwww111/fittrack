import { Schema, model, type InferSchemaType } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

// Lịch tập 1 tuần: mỗi ngày tập trỏ tới một WorkoutTemplate, ngày không có trong `days` là ngày nghỉ.
// Xoá template thì ngày đó bị gỡ khỏi lịch (xem workoutTemplate.service).
const programDaySchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 }, // 1 = thứ Hai ... 7 = Chủ nhật
    templateId: { type: Schema.Types.ObjectId, ref: "WorkoutTemplate", required: true },
  },
  { _id: false }
);

const weeklyProgramSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    days: { type: [programDaySchema], default: [] },
    isFavorite: { type: Boolean, default: false },
    presetKey: { type: String, default: null }, // tạo từ lịch đề xuất nào (nếu có)
  },
  { timestamps: true }
);

weeklyProgramSchema.index({ userId: 1, isFavorite: -1, updatedAt: -1 });

applyToJSON(weeklyProgramSchema);

export type WeeklyProgram = InferSchemaType<typeof weeklyProgramSchema>;

export const WeeklyProgramModel = model("WeeklyProgram", weeklyProgramSchema);
