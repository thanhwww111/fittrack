import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import HistoryScreen from "@/app/history";
import { progressApi } from "@/api/progressApi";
import { foodLogApi } from "@/api/nutritionApi";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("@/api/progressApi", () => ({ progressApi: { history: jest.fn() } }));
jest.mock("@/api/nutritionApi", () => ({ foodLogApi: { list: jest.fn() } }));
jest.mock("@/hooks/useMeals", () => ({ useMeals: () => ({ meals: [] }) }));
const macros = { calories: 130, protein: 2, carbs: 28, fat: 0 };
const day = {
  date: "2026-09-30", logged: true, consumed: macros, target: null,
  workout: { sessions: 1, sets: 3, totalVolume: 1200, duration: 600 },
  workouts: [{ id: "session", name: "Buổi kéo", totalVolume: 1200, duration: 600 }],
};
const history = { today: "2026-10-01", from: "2026-09-25", to: "2026-10-01", days: [day] };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(progressApi.history).mockResolvedValue(history);
  jest.mocked(foodLogApi.list).mockResolvedValue({ date: day.date, items: [{
    id: "food-log", foodId: "rice", foodName: "Cơm trắng", mealType: "LUNCH",
    servingUnit: "g", quantity: 100, date: day.date, createdAt: "2026-09-30T05:00:00Z", fiber: 0, ...macros,
  }] });
});

it("opens a historical day with its food and workout details", async () => {
  await render(<HistoryScreen />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Xem ngày 2026-09-30/ }));
  expect(await screen.findByText("Cơm trắng · 100 g · 130 kcal")).toBeTruthy();
  expect(foodLogApi.list).toHaveBeenCalledWith("2026-09-30");
  expect(screen.getByText("Buổi kéo")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /^Xem buổi tập Buổi kéo/ }));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/workout/session", params: { id: "session" } });
});

it("loads earlier history using server dates and disables the next week at today", async () => {
  await render(<HistoryScreen />);
  await screen.findByRole("button", { name: /^Xem ngày 2026-09-30/ });
  expect(screen.getByRole("button", { name: "7 ngày sau" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "7 ngày trước" }));
  await waitFor(() => expect(progressApi.history).toHaveBeenCalledWith({ to: "2026-09-24" }));
});

it("shows missing records explicitly and offers retry after a load error", async () => {
  jest.mocked(progressApi.history).mockRejectedValueOnce(new Error("offline"));
  await render(<HistoryScreen />);
  jest.mocked(progressApi.history).mockResolvedValue({ ...history, days: [{
    ...day, logged: false, workouts: [], workout: { sessions: 0, sets: 0, totalVolume: 0, duration: 0 },
  }] });
  await fireEvent.press(await screen.findByText("Thử lại"));
  expect(await screen.findByText("Chưa ghi nhận ăn uống hoặc tập luyện.")).toBeTruthy();
});

it("retries a failed food detail load without hiding workout history", async () => {
  jest.mocked(foodLogApi.list).mockRejectedValueOnce(new Error("offline"));
  await render(<HistoryScreen />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Xem ngày 2026-09-30/ }));
  expect(screen.getByText("Buổi kéo")).toBeTruthy();
  await fireEvent.press(await screen.findByText("Tải lại món ăn"));
  expect(await screen.findByText("Cơm trắng · 100 g · 130 kcal")).toBeTruthy();
});
