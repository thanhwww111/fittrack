import { Schema, model, type InferSchemaType } from "mongoose";
import { WORKOUT_STATUSES } from "../constants/enums";

const workoutSetSchema = new Schema(
  {
    setNumber: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true, min: 0 }, // kg, 0 cho bài bodyweight
    reps: { type: Number, required: true, min: 1 },
    completed: { type: Boolean, default: true },
  },
  { _id: false }
);

const sessionExerciseSchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
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

export type WorkoutSession = InferSchemaType<typeof workoutSessionSchema>;

export const WorkoutSessionModel = model("WorkoutSession", workoutSessionSchema);
