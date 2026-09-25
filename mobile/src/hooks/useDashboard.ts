import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { nutritionApi } from "@/api/nutritionApi";
import { progressApi } from "@/api/progressApi";
import { errorMessage } from "@/lib/formErrors";
import type { DailyNutrition, WeeklySummary } from "@/types/models";

interface DashboardData {
  nutrition: DailyNutrition;
  weekly: WeeklySummary;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nutrition, weekly] = await Promise.all([nutritionApi.today(), progressApi.weekly()]);
      setData({ nutrition, weekly });
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
