import { Schema, model, Types } from "mongoose";

export interface ScheduleExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
}
export interface ScheduleSnapshot {
  id: string;
  programId: string;
  name: string;
  effectiveFrom: string;
  timezone: string;
  days: { dayOfWeek: number; templateId: string; templateName: string; exerciseCount: number; exercises: ScheduleExercise[] }[];
}
interface ScheduleState {
  userId: Types.ObjectId;
  revision: number;
  versions: ScheduleSnapshot[];
  requests: { requestId: string; programId: string }[];
}
// One compare-and-swap document owns the complete activation history. Versions are
// append-only, including superseded future versions, so retry keys never disappear.
const exerciseSchema = new Schema<ScheduleExercise>({
  exerciseId: String, exerciseName: String, order: Number,
  targetSets: Number, targetReps: Number, restSeconds: Number,
}, { _id: false });
const snapshotSchema = new Schema<ScheduleSnapshot>({
  id: String, programId: String, name: String, effectiveFrom: String, timezone: String,
  days: [{ _id: false, dayOfWeek: Number, templateId: String, templateName: String,
    exerciseCount: Number, exercises: [exerciseSchema] }],
}, { _id: false });
const schema = new Schema<ScheduleState>({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  revision: { type: Number, default: 0 },
  versions: { type: [snapshotSchema], default: [] },
  requests: [{ _id: false, requestId: String, programId: String }],
});
export const TrainingScheduleModel = model<ScheduleState>("TrainingSchedule", schema);
