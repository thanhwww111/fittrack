export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const ACTIVITY_LEVELS = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOAL_TYPES = ["WEIGHT_LOSS", "MAINTENANCE", "MUSCLE_GAIN"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const SERVING_UNITS = ["g", "ml", "piece"] as const;
export type ServingUnit = (typeof SERVING_UNITS)[number];

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MUSCLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "GLUTES",
  "CORE",
  "FULL_BODY",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENTS = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "KETTLEBELL",
  "OTHER",
] as const;
export type Equipment = (typeof EQUIPMENTS)[number];

export const WORKOUT_STATUSES = ["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

// AUTO: tính từ profile, MANUAL: user tự nhập
export const TARGET_SOURCES = ["AUTO", "MANUAL"] as const;
export type TargetSource = (typeof TARGET_SOURCES)[number];
