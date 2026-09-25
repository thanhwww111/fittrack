import { ExerciseModel } from "../models/exercise.model";
import type { CreateExerciseInput } from "../schemas/workout.schema";

export const SYSTEM_EXERCISES: CreateExerciseInput[] = [
  { name: "Bench Press", muscleGroup: "CHEST", equipment: "BARBELL", description: "" },
  { name: "Incline Dumbbell Press", muscleGroup: "CHEST", equipment: "DUMBBELL", description: "" },
  { name: "Cable Fly", muscleGroup: "CHEST", equipment: "CABLE", description: "" },
  { name: "Push-up", muscleGroup: "CHEST", equipment: "BODYWEIGHT", description: "" },
  { name: "Deadlift", muscleGroup: "BACK", equipment: "BARBELL", description: "" },
  { name: "Barbell Row", muscleGroup: "BACK", equipment: "BARBELL", description: "" },
  { name: "Pull-up", muscleGroup: "BACK", equipment: "BODYWEIGHT", description: "" },
  { name: "Lat Pulldown", muscleGroup: "BACK", equipment: "CABLE", description: "" },
  { name: "Overhead Press", muscleGroup: "SHOULDERS", equipment: "BARBELL", description: "" },
  { name: "Lateral Raise", muscleGroup: "SHOULDERS", equipment: "DUMBBELL", description: "" },
  { name: "Barbell Curl", muscleGroup: "BICEPS", equipment: "BARBELL", description: "" },
  { name: "Hammer Curl", muscleGroup: "BICEPS", equipment: "DUMBBELL", description: "" },
  { name: "Triceps Pushdown", muscleGroup: "TRICEPS", equipment: "CABLE", description: "" },
  { name: "Squat", muscleGroup: "LEGS", equipment: "BARBELL", description: "" },
  { name: "Romanian Deadlift", muscleGroup: "LEGS", equipment: "BARBELL", description: "" },
  { name: "Leg Press", muscleGroup: "LEGS", equipment: "MACHINE", description: "" },
  { name: "Hip Thrust", muscleGroup: "GLUTES", equipment: "BARBELL", description: "" },
  { name: "Hanging Leg Raise", muscleGroup: "CORE", equipment: "BODYWEIGHT", description: "" },
];

// Upsert theo tên nên chạy lại nhiều lần không bị trùng
export async function seedExercises() {
  const ops = SYSTEM_EXERCISES.map((exercise) => ({
    updateOne: {
      filter: { name: exercise.name, createdBy: null },
      update: { $set: { ...exercise, isCustom: false, createdBy: null } },
      upsert: true,
    },
  }));
  return ExerciseModel.bulkWrite(ops);
}
