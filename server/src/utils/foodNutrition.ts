export interface NutritionValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const NUTRIENT_KEYS = ["calories", "protein", "carbs", "fat", "fiber"] as const;

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function scale(values: NutritionValues, factor: number): NutritionValues {
  return {
    calories: round1(values.calories * factor),
    protein: round1(values.protein * factor),
    carbs: round1(values.carbs * factor),
    fat: round1(values.fat * factor),
    fiber: round1(values.fiber * factor),
  };
}

// Dinh dưỡng của `quantity` (cùng đơn vị với servingUnit) dựa trên giá trị của 1 khẩu phần
export function calculateNutrition(
  food: NutritionValues & { servingSize: number },
  quantity: number
): NutritionValues {
  if (food.servingSize <= 0 || quantity <= 0) {
    throw new RangeError("servingSize and quantity must be positive");
  }
  return scale(food, quantity / food.servingSize);
}

// Đổi quantity của một log đã có: scale từ snapshot cũ thay vì đọc lại Food,
// để giá trị vẫn bám theo dữ liệu tại thời điểm log dù Food đã bị sửa hoặc xoá
export function rescaleSnapshot(
  snapshot: NutritionValues,
  oldQuantity: number,
  newQuantity: number
): NutritionValues {
  if (oldQuantity <= 0 || newQuantity <= 0) {
    throw new RangeError("quantities must be positive");
  }
  return scale(snapshot, newQuantity / oldQuantity);
}

export function sumNutrition(items: NutritionValues[]): NutritionValues {
  const total: NutritionValues = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const item of items) {
    for (const key of NUTRIENT_KEYS) total[key] += item[key] ?? 0;
  }
  for (const key of NUTRIENT_KEYS) total[key] = round1(total[key]);
  return total;
}
