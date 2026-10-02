import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import AddFoodScreen from "@/app/food/add";
import MealTemplatesScreen from "@/app/food/templates";
import NutritionScreen from "@/app/(tabs)/nutrition";
import { foodApi } from "@/api/foodApi";
import { mealApi, mealTemplateApi } from "@/api/nutritionApi";
import { DEFAULT_MEALS } from "@/lib/nutrition";
import { useMealStore } from "@/stores/mealStore";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { DailyNutrition, FoodLog, MealOption } from "@/types/models";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), dismissTo: jest.fn(), back: jest.fn() },
  Link: ({ children }: { children: ReactNode }) => children,
  useLocalSearchParams: () => ({ foodId: "rice", mealType: "CUSTOM_123456789012345678901234", date: "2026-09-29" }),
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("@/components/nutrition/WaterCard", () => ({ WaterCard: () => null }));
jest.mock("@/api/foodApi", () => ({ foodApi: { get: jest.fn(), favorites: jest.fn() } }));
jest.mock("@/api/nutritionApi", () => ({
  mealApi: { list: jest.fn() },
  mealTemplateApi: { list: jest.fn(), apply: jest.fn() },
}));

const custom: MealOption = { id: "CUSTOM_123456789012345678901234", name: "Sau tập", isCustom: true };
const macros = { calories: 130, protein: 2, carbs: 28, fat: 0, fiber: 0 };
const log: FoodLog = { id: "log", foodId: "rice", foodName: "Rice", date: "2026-09-29",
  mealType: custom.id, servingUnit: "g", quantity: 100, createdAt: "2026-09-29T12:00:00Z", ...macros };
const summary: DailyNutrition = {
  date: "2026-09-29", target: null, remaining: null, consumed: macros, logCount: 1,
  meals: { BREAKFAST: { ...macros, calories: 0 }, LUNCH: { ...macros, calories: 0 },
    DINNER: { ...macros, calories: 0 }, SNACK: { ...macros, calories: 0 }, [custom.id]: macros },
  mealOptions: [...DEFAULT_MEALS, custom],
};

beforeEach(() => {
  jest.clearAllMocks();
  useMealStore.getState().reset();
  useNutritionStore.getState().reset();
  useNutritionStore.setState({
    today: "2026-09-30", selectedDate: summary.date, summary, logs: [log],
    addLog: jest.fn().mockResolvedValue(log), load: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
  });
  jest.mocked(mealApi.list).mockResolvedValue([...DEFAULT_MEALS, custom]);
});

it("keeps the custom selection through the quantity form and saving", async () => {
  jest.mocked(foodApi.get).mockResolvedValue({ id: "rice", name: "Rice", servingSize: 100,
    servingUnit: "g", isCustom: false, createdBy: null, ...macros });
  jest.mocked(foodApi.favorites).mockResolvedValue([]);
  await render(<AddFoodScreen />);
  expect(await screen.findByRole("radio", { name: "Sau tập" })).toBeSelected();
  await fireEvent.press(screen.getByText("Thêm vào nhật ký"));
  expect(useNutritionStore.getState().addLog).toHaveBeenCalledWith({
    foodId: "rice", mealType: custom.id, quantity: 100, date: summary.date,
  });
});

it("renders the custom section and opens its add and meal-template flows with the same date", async () => {
  await render(<NutritionScreen />);
  expect(screen.getByText("Sau tập")).toBeTruthy();
  expect(screen.getByText("Rice")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Thêm món vào Sau tập"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/search", params: { mealType: custom.id, date: summary.date } });
  await fireEvent.press(screen.getByLabelText("Bữa mẫu cho Sau tập"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/templates", params: { mealType: custom.id, date: summary.date } });
});

it("applies a saved meal template to the custom meal without falling back to breakfast", async () => {
  jest.mocked(mealTemplateApi.list).mockResolvedValue([{ id: "template", name: "Cơm sau tập", items: [{ foodId: "rice", quantity: 100, available: true, foodName: "Rice", servingUnit: "g", nutrition: macros }], totals: macros }]);
  jest.mocked(mealTemplateApi.apply).mockResolvedValue({ date: summary.date, mealType: custom.id, items: [log], skipped: 0 });
  await render(<MealTemplatesScreen />);
  await fireEvent.press(await screen.findByText("Thêm vào sau tập · 130 kcal"));
  await waitFor(() => expect(mealTemplateApi.apply).toHaveBeenCalledWith("template", { mealType: custom.id, date: summary.date }));
});
