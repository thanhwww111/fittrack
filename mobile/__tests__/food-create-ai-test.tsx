import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { router } from "expo-router";
import CreateFoodScreen from "@/app/food/create";
import { aiApi } from "@/api/aiApi";
import { foodApi } from "@/api/foodApi";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ mealType: "LUNCH", date: "2026-09-30" }),
}));
jest.mock("@/api/aiApi", () => ({ aiApi: { estimateFood: jest.fn() } }));
jest.mock("@/api/foodApi", () => ({ foodApi: { create: jest.fn() } }));

const option = {
  name: "Sandwich trứng nhỏ", servingSize: 1, servingUnit: "piece" as const,
  calories: 180, protein: 8, carbs: 22, fat: 7, fiber: 2,
  description: "Khoảng 70 g, có trứng, không sốt.",
};
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it("fills every food field only after selection and saves subsequent manual edits", async () => {
  jest.mocked(aiApi.estimateFood).mockResolvedValue({ suggestions: [option, { ...option, name: "Sandwich phô mai nhỏ" }] });
  jest.mocked(foodApi.create).mockResolvedValue({ ...option, id: "new-food", createdBy: "user", isCustom: true });
  await render(<CreateFoodScreen />);
  await fireEvent.changeText(screen.getByLabelText("Tên món"), "sandwich");
  await fireEvent.press(screen.getByText("AI hỗ trợ dinh dưỡng"));
  await fireEvent.changeText(screen.getByLabelText("Mô tả món ăn"), "1 miếng sandwich nhỏ");
  await fireEvent.press(screen.getByText("Đề xuất dinh dưỡng"));
  await screen.findByText(option.name);
  expect(screen.getByRole("link", { name: "Tìm dinh dưỡng món này trên Google" })).toBeTruthy();
  expect(screen.getByLabelText("Calories").props.value).toBe("");
  expect(foodApi.create).not.toHaveBeenCalled();
  await fireEvent.press(screen.getAllByText("Dùng lựa chọn này")[0]);
  expect(screen.getByLabelText("Tên món").props.value).toBe(option.name);
  expect(screen.getByLabelText("Khẩu phần").props.value).toBe("1");
  expect(screen.getByRole("radio", { name: "cái" })).toBeSelected();
  expect(screen.getByLabelText("Calories").props.value).toBe("180");
  expect(screen.getByLabelText("Protein").props.value).toBe("8");
  expect(screen.getByLabelText("Carbs").props.value).toBe("22");
  expect(screen.getByLabelText("Fat").props.value).toBe("7");
  expect(screen.getByLabelText("Chất xơ (không bắt buộc)").props.value).toBe("2");
  await fireEvent.changeText(screen.getByLabelText("Calories"), "190");
  await fireEvent.press(screen.getByText("Tạo món"));
  await waitFor(() => expect(foodApi.create).toHaveBeenCalledWith({
    name: option.name, servingSize: 1, servingUnit: "piece",
    calories: 190, protein: 8, carbs: 22, fat: 7, fiber: 2,
  }));
  expect(router.replace).toHaveBeenCalledWith({ pathname: "/food/add", params: {
    foodId: "new-food", mealType: "LUNCH", date: "2026-09-30",
  } });
});

it("keeps the form and offers an encoded Google search when AI fails", async () => {
  jest.mocked(aiApi.estimateFood).mockRejectedValue(new Error("offline"));
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await render(<CreateFoodScreen />);
  await fireEvent.changeText(screen.getByLabelText("Tên món"), "Món tự nhập");
  await fireEvent.changeText(screen.getByLabelText("Calories"), "200");
  await fireEvent.press(screen.getByText("AI hỗ trợ dinh dưỡng"));
  await fireEvent.changeText(screen.getByLabelText("Mô tả món ăn"), "sandwich trứng & phô mai");
  await fireEvent.press(screen.getByText("Đề xuất dinh dưỡng"));
  await screen.findByText("Đã có lỗi xảy ra, thử lại sau.");
  expect(screen.getByLabelText("Calories").props.value).toBe("200");
  await fireEvent.press(screen.getByRole("link", { name: "Tìm dinh dưỡng món này trên Google" }));
  const url = new URL(open.mock.calls[0][0]);
  expect(url.origin).toBe("https://www.google.com");
  expect(url.pathname).toBe("/search");
  expect(url.searchParams.get("q")).toBe("sandwich trứng & phô mai dinh dưỡng calories protein carbs fat");
});
