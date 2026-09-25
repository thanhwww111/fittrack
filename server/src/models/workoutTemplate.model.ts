import { Schema, model, type InferSchemaType } from "mongoose";
import { applyToJSON } from "../utils/toJSON";

const templateExerciseSchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    order: { type: Number, required: true, min: 0 },
    targetSets: { type: Number, required: true, min: 1, max: 20 },
    targetReps: { type: Number, required: true, min: 1, max: 100 },
    restSeconds: { type: Number, default: 90, min: 0, max: 900 },
  },
  { _id: false }
);

const workoutTemplateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    exercises: {
      type: [templateExerciseSchema],
      validate: [(v: unknown[]) => v.length > 0, "Workout template needs at least one exercise"],
    },
  },
  { timestamps: true }
);

workoutTemplateSchema.index({ userId: 1 });

applyToJSON(workoutTemplateSchema);

export type WorkoutTemplate = InferSchemaType<typeof workoutTemplateSchema>;

export const WorkoutTemplateModel = model("WorkoutTemplate", workoutTemplateSchema);
