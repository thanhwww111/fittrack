import { MEAL_TYPES, type MealType } from "../constants/enums";
import { FoodLogModel } from "../models/foodLog.model";
import { todayInTimezone } from "../utils/date";
import { round1, sumNutrition, type NutritionValues } from "../utils/foodNutrition";
import { getActiveTarget } from "./goal.service";
import { getUserTimezone } from "./profile.service";

const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;
type Macros = Record<(typeof MACRO_KEYS)[number], number>;

function pickMacros(values: Macros): Macros {
  return {
    calories: values.calories,
    protein: values.protein,
    carbs: values.carbs,
    fat: values.fat,
  };
}

// Âm nghĩa là đã ăn vượt target
function subtractMacros(target: Macros, consumed: Macros): Macros {
  return {
    calories: round1(target.calories - consumed.calories),
    protein: round1(target.protein - consumed.protein),
    carbs: round1(target.carbs - consumed.carbs),
    fat: round1(target.fat - consumed.fat),
  };
}

export async function getDailySummary(userId: string, date?: string) {
  const day = date ?? todayInTimezone(await getUserTimezone(userId));

  const [target, logs] = await Promise.all([
    getActiveTarget(userId, day),
    FoodLogModel.find({ userId, date: day }).lean(),
  ]);

  const toValues = (l: (typeof logs)[number]): NutritionValues => ({
    calories: l.calories,
    protein: l.protein,
    carbs: l.carbs,
    fat: l.fat,
    fiber: l.fiber ?? 0,
  });

  const consumed = sumNutrition(logs.map(toValues));

  const meals = Object.fromEntries(
    MEAL_TYPES.map((meal) => [
      meal,
      sumNutrition(logs.filter((l) => l.mealType === meal).map(toValues)),
    ])
  ) as Record<MealType, NutritionValues>;

  const targetMacros = target ? pickMacros(target) : null;

  return {
    date: day,
    target: targetMacros,
    consumed,
    remaining: targetMacros ? subtractMacros(targetMacros, consumed) : null,
    meals,
    logCount: logs.length,
  };
}
