import { Schema, model, type InferSchemaType } from "mongoose";
import { EQUIPMENTS, MUSCLE_GROUPS } from "../constants/enums";

const exerciseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    muscleGroup: { type: String, enum: MUSCLE_GROUPS, required: true },
    equipment: { type: String, enum: EQUIPMENTS, required: true },
    description: { type: String, default: "", maxlength: 1000 },
    // Exercise hệ thống: isCustom = false, createdBy = null
    isCustom: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

exerciseSchema.index({ muscleGroup: 1 });
exerciseSchema.index({ createdBy: 1 });

export type Exercise = InferSchemaType<typeof exerciseSchema>;

export const ExerciseModel = model("Exercise", exerciseSchema);
