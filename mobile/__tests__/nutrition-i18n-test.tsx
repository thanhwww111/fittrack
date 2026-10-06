import { fireEvent, render, screen } from "@testing-library/react-native";
import { FoodAiHelper } from "@/components/nutrition/FoodAiHelper";
import { aiApi } from "@/api/aiApi";
import { useLanguageStore } from "@/stores/languageStore";

jest.mock("@/api/aiApi", () => ({ aiApi: { estimateFood: jest.fn() } }));
beforeEach(() => useLanguageStore.setState({ locale: "en" }));
afterEach(() => useLanguageStore.setState({ locale: "vi" }));

it("offers English AI controls while preserving the original food and AI response", async () => {
  const suggestion = { name: "Bánh mì trứng", description: "Một ổ nhỏ", servingSize: 1,
    servingUnit: "piece" as const, calories: 200, protein: 10, carbs: 25, fat: 7, fiber: 2 };
  jest.mocked(aiApi.estimateFood).mockResolvedValue({ suggestions: [suggestion] });
  const apply = jest.fn();
  await render(<FoodAiHelper foodName="Món của tôi" disabled={false} onApply={apply} />);
  await fireEvent.press(screen.getByText("AI nutrition assistant"));
  expect(screen.getByLabelText("Food description").props.value).toBe("Món của tôi");
  await fireEvent.press(screen.getByText("Estimate nutrition"));
  expect(await screen.findByText("Bánh mì trứng")).toBeTruthy();
  await fireEvent.press(screen.getByText("Use this option"));
  expect(apply).toHaveBeenCalledWith(suggestion);
});
