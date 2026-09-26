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
  // Server tự đặt khi đổi mục tiêu: cân nặng + ngày bắt đầu mục tiêu hiện tại
  startWeight: number | null;
  goalStartDate: string | null;
  goalRate: number | null; // kg/tuần, null = mặc định theo mục tiêu
  timezone: string;
}

export type UpdateProfileInput = Partial<
  Omit<UserProfile, "id" | "userId" | "startWeight" | "goalStartDate">
>;

export type GoalRateStatus =
  | "ON_TRACK"
  | "TOO_SLOW"
  | "TOO_FAST"
  | "WRONG_DIRECTION"
  | "OFF_TRACK"
  | "NOT_ENOUGH_DATA";

export interface WeeklyWeight {
  weekStart: string;
  average: number | null;
  entries: number;
  change: number | null;
}

// Tốc độ (kg/tuần) có dấu: dương = tăng, âm = giảm
export interface GoalProgress {
  goalType: GoalType | null;
  goalWeight: number | null;
  startWeight: number | null;
  startDate: string | null;
  currentWeight: number | null;
  percent: number | null;
  remaining: number | null;
  reached: boolean | null;
  targetRate: number | null;
  actualRate: number | null;
  status: GoalRateStatus | null;
  estimatedWeeks: number | null;
  weeks: WeeklyWeight[];
}

// dayOfWeek: 1 = thứ Hai ... 7 = Chủ nhật
export interface WeeklyProgramDay {
  dayOfWeek: number;
  templateId: string;
  templateName: string | null;
  exerciseCount: number;
}

export interface WeeklyProgram {
  id: string;
  name: string;
  days: WeeklyProgramDay[];
  isFavorite: boolean;
  presetKey: string | null;
}

export interface WeeklyProgramList {
  todayDayOfWeek: number;
  items: WeeklyProgram[];
}

export interface ProgramPreset {
  key: string;
  name: string;
  description: string;
  daysPerWeek: number;
  days: {
    dayOfWeek: number;
    name: string;
    exercises: { name: string; sets: number; reps: number; rest: number }[];
  }[];
}

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

// needed = target AUTO đang áp dụng không còn khớp hồ sơ (vừa đổi cân nặng, mức vận động, mục tiêu...)
export interface TargetRecalculation {
  needed: boolean;
  current: NutritionTarget | null;
  suggested: Macros | null;
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

export interface DayAdherence {
  met: number;
  days: number;
  percent: number | null;
}

export interface WeeklySummary {
  weekStart: string;
  today: string;
  workout: {
    sessions: number;
    sets: number;
    totalVolume: number;
    duration: number;
    // Volume cùng khoảng ngày tuần trước, volumeChange là % (null khi tuần trước không tập)
    previousVolume: number;
    volumeChange: number | null;
  };
  // percent = null khi chưa có mốc để so (chưa đặt số buổi/tuần, chưa có target...)
  adherence: {
    workout: { completed: number; target: number | null; percent: number | null };
    calories: DayAdherence;
    protein: DayAdherence;
  };
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
  // Thời gian nghỉ copy từ template, null = bài thêm ngoài template (dùng mặc định)
  restSeconds?: number | null;
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
  notes?: string;
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

export interface BodyMeasurement {
  id: string;
  date: string;
  weight: number;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  arm: number | null;
  thigh: number | null;
}

export interface WeightProgress {
  from: string;
  to: string;
  points: { date: string; weight: number }[];
  summary: { start: number | null; current: number | null; change: number | null };
}

export interface WorkoutWeek {
  weekStart: string;
  sessions: number;
  sets: number;
  totalVolume: number;
  duration: number;
}

export interface NutritionDay {
  date: string;
  logged: boolean;
  consumed: Macros;
  target: Macros | null;
}

export interface NutritionProgress {
  from: string;
  to: string;
  days: NutritionDay[];
  summary: WeeklySummary["nutrition"];
}

export interface MealSuggestion extends Macros {
  name: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  // Server tự đánh giá món có vừa với calo còn lại không (số của AI chỉ là ước tính)
  fitsRemaining: boolean;
}

export interface MealSuggestionResult {
  date: string;
  mealType: MealType;
  remaining: Macros;
  suggestions: MealSuggestion[];
}

export interface WorkoutAnalysis {
  weeks: { weekStart: string; sessions: number; volume: number }[];
  summary: string;
  highlights: string[];
  suggestions: string[];
}

export interface NotificationSettings {
  workoutReminder: { enabled: boolean; days: number[]; time: string }; // days: 0 = CN ... 6 = T7
  mealReminders: { enabled: boolean; breakfast: string; lunch: string; dinner: string };
  weeklyReport: boolean;
  prAlerts: boolean;
  goalAlerts: boolean;
}

export type UpdateNotificationSettings = {
  workoutReminder?: Partial<NotificationSettings["workoutReminder"]>;
  mealReminders?: Partial<NotificationSettings["mealReminders"]>;
  weeklyReport?: boolean;
  prAlerts?: boolean;
  goalAlerts?: boolean;
};

export interface MealTemplateItem {
  foodId: string;
  quantity: number;
  // false = món đã bị xoá, không được ghi khi dùng bữa mẫu
  available: boolean;
  foodName: string | null;
  servingUnit: ServingUnit | null;
  nutrition: NutritionValues | null;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: MealTemplateItem[];
  totals: NutritionValues;
}

export interface WaterDay {
  date: string;
  amount: number; // ml
  target: number; // ml
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  sessionName: string;
  date: string;
  sets: { setNumber: number; weight: number; reps: number }[];
  volume: number;
  best: RecordValues;
}

export interface ExerciseHistory {
  exercise: Exercise;
  record: (RecordValues & { achievedAt: string }) | null;
  entries: ExerciseHistoryEntry[];
}
