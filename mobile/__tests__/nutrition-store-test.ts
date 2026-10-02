import { foodLogApi, nutritionApi } from "@/api/nutritionApi";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { DailyNutrition, FoodLog } from "@/types/models";

jest.mock("@/api/nutritionApi", () => ({
  foodLogApi: { create: jest.fn(), list: jest.fn() },
  nutritionApi: { today: jest.fn(), daily: jest.fn() },
}));
jest.mock("@/stores/notificationStore", () => ({
  useNotificationStore: { getState: () => ({ refreshNutritionReminders: jest.fn() }) },
}));

const macros = { calories: 130, protein: 2, carbs: 28, fat: 0, fiber: 0 };
const summary: DailyNutrition = {
  date: "2026-10-01", consumed: macros, target: null, remaining: null,
  logCount: 1, meals: { BREAKFAST: macros, LUNCH: macros, DINNER: macros, SNACK: macros },
};
const log: FoodLog = {
  id: "log", foodId: "rice", foodName: "Rice", mealType: "LUNCH", quantity: 100,
  servingUnit: "g", date: summary.date, createdAt: "2026-10-01T05:00:00Z", ...macros,
};

beforeEach(() => {
  jest.resetAllMocks();
  useNutritionStore.getState().reset();
  jest.mocked(nutritionApi.today).mockResolvedValue(summary);
  jest.mocked(nutritionApi.daily).mockImplementation(async (date) => ({ ...summary, date }));
  jest.mocked(foodLogApi.list).mockImplementation(async (date) => ({ date: date ?? summary.date, items: [log] }));
  jest.mocked(foodLogApi.create).mockResolvedValue(log);
});

it("initializes all nutrition screen data when logging food before the tab was opened", async () => {
  await useNutritionStore.getState().addLog({ foodId: "rice", mealType: "LUNCH", quantity: 100 });
  await useNutritionStore.getState().reload();
  expect(useNutritionStore.getState()).toMatchObject({
    today: summary.date, selectedDate: summary.date, summary, logs: [log], isLoading: false, error: null,
  });
});

it("keeps today's server date separate from a historical date loaded first", async () => {
  await useNutritionStore.getState().load("2026-09-30");
  expect(useNutritionStore.getState()).toMatchObject({
    today: "2026-10-01", selectedDate: "2026-09-30", isLoading: false,
    summary: { date: "2026-09-30" },
  });
});

it("stops loading on an API error and recovers on retry", async () => {
  jest.mocked(nutritionApi.daily).mockRejectedValueOnce(new Error("offline"));
  await useNutritionStore.getState().load("2026-09-30");
  expect(useNutritionStore.getState().isLoading).toBe(false);
  expect(useNutritionStore.getState().error).toBeTruthy();
  await useNutritionStore.getState().load("2026-09-30");
  expect(useNutritionStore.getState()).toMatchObject({ today: summary.date, error: null, isLoading: false });
});
