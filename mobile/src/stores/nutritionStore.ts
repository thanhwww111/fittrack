import { create } from "zustand";
import {
  foodLogApi,
  nutritionApi,
  type CreateFoodLogInput,
  type UpdateFoodLogInput,
} from "@/api/nutritionApi";
import { errorMessage } from "@/lib/formErrors";
import type { DailyNutrition, FoodLog } from "@/types/models";
import { useNotificationStore } from "@/stores/notificationStore";

interface NutritionState {
  // Hôm nay theo server (timezone trong profile), dùng làm mốc chuyển ngày
  today: string | null;
  selectedDate: string | null;
  summary: DailyNutrition | null;
  logs: FoodLog[];
  isLoading: boolean;
  error: string | null;

  load: (date?: string) => Promise<void>;
  reload: () => Promise<void>;
  addLog: (input: CreateFoodLogInput) => Promise<FoodLog>;
  updateLog: (id: string, input: UpdateFoodLogInput) => Promise<FoodLog>;
  deleteLog: (id: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  today: null,
  selectedDate: null,
  summary: null,
  logs: [],
  isLoading: false,
  error: null,
};

export const useNutritionStore = create<NutritionState>()((set, get) => ({
  ...initialState,

  load: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const [summary, logs] = await Promise.all([
        date ? nutritionApi.daily(date) : nutritionApi.today(),
        foodLogApi.list(date),
      ]);
      set((state) => ({
        summary,
        logs: logs.items,
        selectedDate: summary.date,
        today: date ? state.today : summary.date,
        isLoading: false,
      }));
      // Số liệu hôm nay đổi → cập nhật nội dung nhắc "còn thiếu bao nhiêu"
      if (summary.date === get().today) {
        void useNotificationStore.getState().refreshNutritionReminders(summary);
      }
    } catch (err) {
      set({ isLoading: false, error: errorMessage(err) });
    }
  },

  reload: () => get().load(get().selectedDate ?? undefined),

  // Sau mỗi thay đổi tải lại tổng hợp từ server, không tự cộng trừ ở client
  addLog: async (input) => {
    const log = await foodLogApi.create(input);
    await get().load(log.date);
    return log;
  },

  updateLog: async (id, input) => {
    const log = await foodLogApi.update(id, input);
    await get().load(log.date);
    return log;
  },

  deleteLog: async (id) => {
    await foodLogApi.remove(id);
    await get().reload();
  },

  reset: () => set(initialState),
}));
