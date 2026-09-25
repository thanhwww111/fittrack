import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { nutritionApi } from "@/api/nutritionApi";
import { progressApi } from "@/api/progressApi";
import { sessionApi } from "@/api/workoutApi";
import { errorMessage } from "@/lib/formErrors";
import type { DailyNutrition, WeeklySummary, WorkoutSession } from "@/types/models";

interface DashboardData {
  nutrition: DailyNutrition;
  weekly: WeeklySummary;
  workoutToday: { active: WorkoutSession | null; completed: WorkoutSession[] };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Dashboard không tự tính: mỗi phần lấy từ đúng API tổng hợp của server
      const [nutrition, weekly, workoutToday] = await Promise.all([
        nutritionApi.today(),
        progressApi.weekly(),
        sessionApi.today(),
      ]);
      setData({ nutrition, weekly, workoutToday });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  // Tải lại mỗi khi quay về màn hình (ví dụ vừa cập nhật target ở Profile)
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  return { data, error, isLoading, isRefreshing, refresh };
}
