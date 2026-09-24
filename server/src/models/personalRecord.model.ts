import { Schema, model, type InferSchemaType } from "mongoose";

// Bảng cache PR theo từng bài tập. Có thể tính lại toàn bộ từ WorkoutSession.
const personalRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    maxWeight: { type: Number, required: true, min: 0 },
    maxReps: { type: Number, required: true, min: 0 },
    estimatedOneRepMax: { type: Number, required: true, min: 0 },
    sessionId: { type: Schema.Types.ObjectId, ref: "WorkoutSession", default: null },
    achievedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

personalRecordSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

export type PersonalRecord = InferSchemaType<typeof personalRecordSchema>;

export const PersonalRecordModel = model("PersonalRecord", personalRecordSchema);
