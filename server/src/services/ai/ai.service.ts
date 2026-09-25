import { WorkoutSessionModel } from "../../models/workoutSession.model";
import type { MealSuggestionInput } from "../../schemas/ai.schema";
import { AppError } from "../../utils/AppError";
import { addDays, startOfWeek, todayInTimezone } from "../../utils/date";
import { getDailySummary } from "../nutrition.service";
import { getProfileDocument, getUserTimezone } from "../profile.service";
import { llm } from "./llm";
import {
  buildMealPrompt,
  buildWorkoutPrompt,
  MEAL_SYSTEM_PROMPT,
  mealSuggestionSchema,
  summarizeWorkoutHistory,
  WORKOUT_SYSTEM_PROMPT,
  workoutAnalysisSchema,
} from "./prompts";

const ANALYSIS_WEEKS = 4;
// Món ăn được coi là vừa nếu không vượt calo còn lại quá 10% (tối thiểu 50 kcal)
const CALORIE_TOLERANCE = 0.1;

export async function suggestMeals(userId: string, input: MealSuggestionInput) {
  const [summary, profile] = await Promise.all([
    getDailySummary(userId),
    getProfileDocument(userId),
  ]);

  if (!summary.target || !summary.remaining) {
    throw AppError.badRequest("Set a nutrition target before asking for meal suggestions");
  }

  const remaining = summary.remaining;
  const result = await llm.generateJson({
    system: MEAL_SYSTEM_PROMPT,
    prompt: buildMealPrompt({
      mealType: input.mealType,
      remaining,
      goalType: profile.goalType ?? null,
      preferences: input.preferences,
    }),
    schema: mealSuggestionSchema,
  });

  // Số của AI chỉ là ước tính: server tự đánh giá món nào vừa với phần còn lại
  const limit = Math.max(0, remaining.calories) * (1 + CALORIE_TOLERANCE) + 50;
  return {
    date: summary.date,
    mealType: input.mealType,
    remaining,
    suggestions: result.suggestions.map((s) => ({ ...s, fitsRemaining: s.calories <= limit })),
  };
}

export async function analyzeWorkouts(userId: string) {
  const timezone = await getUserTimezone(userId);
  const today = todayInTimezone(timezone);
  const firstWeek = addDays(startOfWeek(today), -7 * (ANALYSIS_WEEKS - 1));
  const weekStarts = Array.from({ length: ANALYSIS_WEEKS }, (_, i) => addDays(firstWeek, 7 * i));

  const sessions = await WorkoutSessionModel.find({
    userId,
    status: "COMPLETED",
    completedAt: { $gte: new Date(`${addDays(firstWeek, -1)}T00:00:00Z`) },
  })
    .select("completedAt totalVolume exercises.exerciseName exercises.sets")
    .lean();

  const history = sessions
    .map((s) => ({
      date: todayInTimezone(timezone, s.completedAt!),
      totalVolume: s.totalVolume,
      exercises: s.exercises.map((e) => ({ exerciseName: e.exerciseName, sets: e.sets })),
    }))
    .filter((s) => s.date >= firstWeek);

  if (history.length < 2) {
    throw AppError.badRequest("Complete at least 2 workouts in the last 4 weeks to get an analysis");
  }

  const summary = summarizeWorkoutHistory(history, weekStarts);
  const analysis = await llm.generateJson({
    system: WORKOUT_SYSTEM_PROMPT,
    prompt: buildWorkoutPrompt(summary),
    schema: workoutAnalysisSchema,
  });

  return { weeks: summary.weeks, ...analysis };
}
