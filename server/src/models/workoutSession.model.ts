import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { WORKOUT_STATUSES } from "../constants/enums";
import { applyToJSON } from "../utils/toJSON";

const workoutSetSchema = new Schema(
  {
    setNumber: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true, min: 0, max: 1000 }, // kg, 0 cho bài bodyweight
    reps: { type: Number, required: true, min: 1, max: 1000 },
    completed: { type: Boolean, default: true },
  },
  { _id: false }
);

const sessionExerciseSchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    exerciseName: { type: String, required: true }, // snapshot để lịch sử vẫn đọc được nếu exercise bị xoá
    targetSets: { type: Number, default: null },
    targetReps: { type: Number, default: null },
    restSeconds: { type: Number, default: null }, // copy từ template, app dùng cho hẹn giờ nghỉ
    sets: { type: [workoutSetSchema], default: [] },
  },
  { _id: false }
);

const workoutSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "WorkoutTemplate", default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    exercises: { type: [sessionExerciseSchema], default: [] },
    totalVolume: { type: Number, default: 0, min: 0 }, // tổng weight × reps của các set completed
    duration: { type: Number, default: 0, min: 0 }, // giây
    status: { type: String, enum: WORKOUT_STATUSES, default: "IN_PROGRESS" },
  },
  { timestamps: true }
);

workoutSessionSchema.index({ userId: 1, startedAt: -1 });
workoutSessionSchema.index({ userId: 1, status: 1 });
// Mỗi user chỉ có tối đa một buổi tập đang diễn ra, chặn cả khi 2 request đến cùng lúc
workoutSessionSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "IN_PROGRESS" },
    name: "one_active_session_per_user",
  }
);

applyToJSON(workoutSessionSchema);

export type WorkoutSession = InferSchemaType<typeof workoutSessionSchema>;
export type WorkoutSessionDocument = HydratedDocument<WorkoutSession>;

export const WorkoutSessionModel = model("WorkoutSession", workoutSessionSchema);
