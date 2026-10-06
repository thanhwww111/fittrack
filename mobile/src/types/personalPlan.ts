import type { NutritionValues, ServingUnit, MealType } from './models';
export type PlanSport = 'YOGA' | 'WALKING';
export interface LifestyleSurvey {
  revision: number; sport: PlanSport; experience: 'BEGINNER' | 'REGULAR';
  availableDays: { dayOfWeek: number; time: string; durationMinutes: number }[];
  mealTimes: { mealId: MealType; time: string }[];
  preferredFoodIds: string[]; excludedFoodIds: string[]; remindersEnabled: boolean;
}
export interface PlannedItem extends NutritionValues {
  id: string; foodId: string; foodName: string; servingUnit: ServingUnit; quantity: number; foodVersion: string; logId?: string;
}
export interface PlanActivity {
  focus?: string; intensity?: 'EASY' | 'MODERATE';
  id: string; sport: PlanSport; time: string; plannedMinutes: number;
  steps: { vi: string; en: string; minutes: number }[];
  status?: 'PLANNED' | 'COMPLETED' | 'SKIPPED' | 'MISSED'; actualMinutes?: number; note?: string; revision?: number;
}
export interface PlanDay {
  coachNote?: string;
  date: string; activity: PlanActivity | null; effective?: boolean;
  meals: { mealId: MealType; time: string; items: PlannedItem[] }[]; totals: NutritionValues;
}
export interface PersonalPlan {
  generatorVersion?: string; coachSummary?: string;
  id: string; revision: number; state: 'DRAFT' | 'PUBLISHED'; timezone: string; startDate: string; endDate: string;
  sourceSurveyRevision: number; surveySnapshot: LifestyleSurvey;
  targetSnapshot: { id: string; effectiveFrom: string; calories: number; protein: number; carbs: number; fat: number };
  days: PlanDay[]; targetChanged?: boolean;
}
export interface PersonalPlanResponse { today: string; date: string; timezone: string; current: PersonalPlan | null; pending: PersonalPlan | null; upcoming?: PersonalPlan[]; expired: boolean }
export interface PlanHistoryEntry { id: string; startDate: string; endDate: string; sport: PlanSport }
