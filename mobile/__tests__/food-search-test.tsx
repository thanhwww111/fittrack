import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import FoodSearchScreen from "@/app/food/search";
import { mealApi } from "@/api/nutritionApi";
import { useMealStore } from "@/stores/mealStore";

jest.mock("@/api/nutritionApi", () => ({
  ...jest.requireActual("@/api/nutritionApi"),
  mealApi: { list: jest.fn(), create: jest.fn() },
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn(),
}));
jest.mock("@/hooks/useFoodSearch", () => ({
  useFoodSearch: () => ({
    items: [{ id: "rice", name: "Rice", servingSize: 100, servingUnit: "g",
      calories: 130, protein: 2, carbs: 28, fat: 0, fiber: 0, isCustom: false, createdBy: null }],
    isLoading: false, error: null, loadMore: jest.fn(), refresh: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useMealStore.getState().reset();
  jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(mealApi.list).mockResolvedValue([
    { id: "BREAKFAST", name: "Bữa sáng", isCustom: false },
    { id: "LUNCH", name: "Bữa trưa", isCustom: false },
    { id: "DINNER", name: "Bữa tối", isCustom: false },
    { id: "SNACK", name: "Ăn vặt", isCustom: false },
  ]);
});
afterEach(() => jest.restoreAllMocks());

it("creates and selects a custom meal then passes its id to food entry", async () => {
  const id = "CUSTOM_123456789012345678901234";
  jest.mocked(mealApi.create).mockResolvedValue({ id, name: "Sau tập", isCustom: true });
  await render(<FoodSearchScreen />);
  await fireEvent.press(screen.getByText("+ Thêm bữa tùy chọn"));
  await fireEvent.changeText(screen.getByLabelText("Tên bữa mới"), "Sau tập");
  await fireEvent.press(screen.getByText("Lưu bữa"));
  expect(await screen.findByRole("radio", { name: "Sau tập" })).toBeSelected();
  await fireEvent.press(screen.getByText("Tiếp tục chọn món"));
  await fireEvent.press(screen.getByText("Rice"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/add", params: { foodId: "rice", mealType: id } });
});

it("opens an existing custom meal directly without reverting to the suggested default", async () => {
  const id = "CUSTOM_123456789012345678901234";
  jest.mocked(mealApi.list).mockResolvedValue([{ id, name: "Trước tập", isCustom: true }]);
  jest.mocked(useLocalSearchParams).mockReturnValue({ mealType: id, date: "2026-09-29" });
  await render(<FoodSearchScreen />);
  await screen.findByText("Trước tập");
  expect(screen.queryByText("Tiếp tục chọn món")).toBeNull();
  await fireEvent.press(screen.getByText("Rice"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/add", params: {
    foodId: "rice", mealType: id, date: "2026-09-29",
  } });
});

it.each([
  [9, "Bữa sáng"], [10, "Bữa trưa"], [13, "Bữa trưa"],
  [14, "Ăn vặt"], [16, "Ăn vặt"], [17, "Bữa tối"],
])("suggests the appropriate meal at %i hours", async (hour, name) => {
  jest.mocked(Date.prototype.getHours).mockReturnValue(hour);
  await render(<FoodSearchScreen />);
  expect(screen.getByRole("radio", { name })).toBeSelected();
});

it("selects lunch at noon, waits for confirmation and carries a changed meal to food entry", async () => {
  await render(<FoodSearchScreen />);
  expect(screen.getByRole("radio", { name: "Bữa trưa" })).toBeSelected();
  expect(screen.queryByLabelText("Tìm món ăn")).toBeNull();
  await fireEvent.press(screen.getByRole("radio", { name: "Bữa sáng" }));
  await fireEvent.press(screen.getByText("Tiếp tục chọn món"));
  await fireEvent.press(screen.getByText("Rice"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/add", params: { foodId: "rice", mealType: "BREAKFAST" } });
});

it("skips meal selection and preserves the specified meal and date when creating food", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ mealType: "DINNER", date: "2026-09-29" });
  await render(<FoodSearchScreen />);
  expect(screen.getByLabelText("Tìm món ăn")).toBeTruthy();
  expect(screen.queryByText("Tiếp tục chọn món")).toBeNull();
  await fireEvent.press(screen.getByText("Không có món bạn cần? Tạo món mới"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/create", params: { mealType: "DINNER", date: "2026-09-29" } });
});

it("can revisit meal selection and carries the new meal and original date to food entry", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ mealType: "DINNER", date: "2026-09-29" });
  await render(<FoodSearchScreen />);
  await fireEvent.press(screen.getByText("Đổi bữa"));
  expect(screen.getByRole("radio", { name: "Bữa tối" })).toBeSelected();
  await fireEvent.press(screen.getByRole("radio", { name: "Bữa sáng" }));
  expect(screen.getByRole("radio", { name: "Bữa tối" })).not.toBeSelected();
  await fireEvent.press(screen.getByText("Tiếp tục chọn món"));
  await fireEvent.press(screen.getByText("Rice"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/food/add", params: {
    foodId: "rice", mealType: "BREAKFAST", date: "2026-09-29",
  } });
});

it.each(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])(
  "opens food search directly for %s and keeps the selected date",
  async (mealType) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ mealType, date: "2026-09-29" });
    await render(<FoodSearchScreen />);
    expect(screen.queryByText("Bạn muốn ghi món vào bữa nào?")).toBeNull();
    await fireEvent.press(screen.getByText("Rice"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/food/add", params: {
      foodId: "rice", mealType, date: "2026-09-29",
    } });
  }
);
