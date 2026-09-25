// Kiểu dữ liệu khớp với response của server (server/src/models)

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type GoalType = "WEIGHT_LOSS" | "MAINTENANCE" | "MUSCLE_GAIN";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  gender: Gender | null;
  age: number | null;
  height: number | null;
  currentWeight: number | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  goalWeight: number | null;
  trainingDaysPerWeek: number | null;
  timezone: string;
}

export type UpdateProfileInput = Partial<Omit<UserProfile, "id" | "userId">>;

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionTarget extends Macros {
  id: string;
  effectiveFrom: string;
  source: "AUTO" | "MANUAL";
}

export interface GoalsOverview {
  today: string;
  current: NutritionTarget | null;
  history: NutritionTarget[];
}

export interface DailyNutrition {
  date: string;
  target: Macros | null;
  consumed: Macros & { fiber: number };
  remaining: Macros | null;
  meals: Record<MealType, Macros & { fiber: number }>;
  logCount: number;
}

export interface WeeklySummary {
  weekStart: string;
  today: string;
  workout: { sessions: number; sets: number; totalVolume: number; duration: number };
  nutrition: {
    loggedDays: number;
    averages: Macros;
    daysOnCalorieTarget: number;
    daysProteinGoalMet: number;
  };
  weight: { current: number | null; baseline: number | null; change: number | null };
  newPersonalRecords: number;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
