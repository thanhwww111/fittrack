import type { ActivityLevel, Gender, GoalType } from "../constants/enums";

export interface TargetInput {
  gender: Gender;
  age: number;
  height: number; // cm
  currentWeight: number; // kg
  activityLevel: ActivityLevel;
  goalType: GoalType;
  goalRate?: number | null; // kg/tuần user tự đặt, bỏ trống = dùng mức dư/thâm hụt mặc định
}

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

// Thâm hụt / dư calo mỗi ngày so với TDEE
const GOAL_CALORIE_DELTA: Record<GoalType, number> = {
  WEIGHT_LOSS: -500,
  MAINTENANCE: 0,
  MUSCLE_GAIN: 300,
};

// Gram protein trên mỗi kg cân nặng
const PROTEIN_PER_KG: Record<GoalType, number> = {
  WEIGHT_LOSS: 2.0,
  MAINTENANCE: 1.6,
  MUSCLE_GAIN: 1.8,
};

const FAT_CALORIE_RATIO = 0.25;
const MIN_CALORIES = 1200;

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

// Mifflin-St Jeor. Với gender OTHER lấy trung bình của nam và nữ.
export function calculateBMR({ gender, age, height, currentWeight }: TargetInput) {
  const base = 10 * currentWeight + 6.25 * height - 5 * age;
  const genderOffset = gender === "MALE" ? 5 : gender === "FEMALE" ? -161 : -78;
  return base + genderOffset;
}

export function calculateTDEE(input: TargetInput) {
  return calculateBMR(input) * ACTIVITY_MULTIPLIER[input.activityLevel];
}

// ~7700 kcal cho mỗi kg cân nặng tăng/giảm
const KCAL_PER_KG = 7700;

function dailyCalorieDelta({ goalType, goalRate }: TargetInput) {
  if (goalType === "MAINTENANCE" || goalRate == null) return GOAL_CALORIE_DELTA[goalType];
  const delta = (goalRate * KCAL_PER_KG) / 7;
  return goalType === "WEIGHT_LOSS" ? -delta : delta;
}

export function calculateNutritionTarget(input: TargetInput): MacroTarget {
  const calories = Math.max(
    MIN_CALORIES,
    Math.round(calculateTDEE(input) + dailyCalorieDelta(input))
  );

  const protein = Math.round(input.currentWeight * PROTEIN_PER_KG[input.goalType]);
  const fat = Math.round((calories * FAT_CALORIE_RATIO) / KCAL_PER_GRAM.fat);

  const remainingCalories =
    calories - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat;
  const carbs = Math.max(0, Math.round(remainingCalories / KCAL_PER_GRAM.carbs));

  return { calories, protein, carbs, fat };
}
