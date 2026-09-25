import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { progressApi } from "@/api/progressApi";
import { errorMessage } from "@/lib/formErrors";
import { addDays } from "@/lib/nutrition";
import type { NutritionProgress, WeightProgress, WorkoutWeek } from "@/types/models";

export const RANGES = [
  { key: "1m", label: "1 tháng", days: 30, weeks: 4 },
  { key: "3m", label: "3 tháng", days: 90, weeks: 12 },
  { key: "6m", label: "6 tháng", days: 180, weeks: 26 },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

// Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD
export function localToday() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

interface ProgressData {
  weight: WeightProgress;
  workoutWeeks: WorkoutWeek[];
  nutrition: NutritionProgress;
}

export function useProgress(rangeKey: RangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey)!;
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [weight, workout, nutrition] = await Promise.all([
        progressApi.weight({ from: addDays(localToday(), -(range.days - 1)) }),
        progressApi.workout(range.weeks),
        progressApi.nutrition(), // mặc định 7 ngày gần nhất
      ]);
      setData({ weight, workoutWeeks: workout.weeks, nutrition });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [range.days, range.weeks]);

  // Tải lại khi đổi khoảng thời gian hoặc quay về tab
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  return { data, error, isRefreshing, refresh, reload: load };
}
