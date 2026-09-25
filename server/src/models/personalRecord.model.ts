import { Schema, model, type InferSchemaType } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

// Bảng cache PR theo từng bài tập, cập nhật khi complete workout.
// Có thể tính lại toàn bộ từ các WorkoutSession đã COMPLETED.
const personalRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    exerciseName: { type: String, required: true },
    maxWeight: { type: Number, required: true, min: 0 },
    maxReps: { type: Number, required: true, min: 0 },
    estimatedOneRepMax: { type: Number, required: true, min: 0 },
    sessionId: { type: Schema.Types.ObjectId, ref: "WorkoutSession", default: null },
    achievedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

personalRecordSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

applyToJSON(personalRecordSchema);

export type PersonalRecord = InferSchemaType<typeof personalRecordSchema>;

export const PersonalRecordModel = model("PersonalRecord", personalRecordSchema);
