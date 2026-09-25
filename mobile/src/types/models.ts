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

export type ServingUnit = "g" | "ml" | "piece";

export interface NutritionValues extends Macros {
  fiber: number;
}

export interface Food extends NutritionValues {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: ServingUnit;
  isCustom: boolean;
  createdBy: string | null;
}

export type CreateFoodInput = Omit<Food, "id" | "isCustom" | "createdBy">;

// Snapshot dinh dưỡng tại thời điểm ghi, do server tính
export interface FoodLog extends NutritionValues {
  id: string;
  date: string;
  mealType: MealType;
  foodId: string;
  foodName: string;
  servingUnit: ServingUnit;
  quantity: number;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "LEGS"
  | "GLUTES"
  | "CORE"
  | "FULL_BODY";

export type Equipment =
  | "BARBELL"
  | "DUMBBELL"
  | "MACHINE"
  | "CABLE"
  | "BODYWEIGHT"
  | "KETTLEBELL"
  | "OTHER";

export type WorkoutStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  description: string;
  isCustom: boolean;
}

export interface TemplateExercise {
  // GET /workout-templates/:id populate thành object, danh sách thì chỉ là id
  exerciseId: string | Pick<Exercise, "id" | "name" | "muscleGroup" | "equipment">;
  order: number;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  updatedAt: string;
}

export interface TemplateExerciseInput {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  restSeconds?: number;
}

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets: number | null;
  targetReps: number | null;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  templateId: string | null;
  startedAt: string;
  completedAt: string | null;
  exercises: SessionExercise[];
  totalVolume: number;
  duration: number;
  status: WorkoutStatus;
}

export type RecordField = "maxWeight" | "maxReps" | "estimatedOneRepMax";

export interface RecordValues {
  maxWeight: number;
  maxReps: number;
  estimatedOneRepMax: number;
}

export interface NewRecord {
  exerciseId: string;
  exerciseName: string;
  improved: RecordField[];
  record: RecordValues;
}

export interface PersonalRecord extends RecordValues {
  id: string;
  exerciseId: string;
  exerciseName: string;
  achievedAt: string;
}
