import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { WeeklyCheckInGate } from "@/components/profile/WeeklyCheckInGate";
import { weeklyCheckInApi } from "@/api/weeklyCheckInApi";
import { weekInTimezone } from "@/lib/weeklyCheckIn";
import { useAuthStore } from "@/stores/authStore";
import type { UserProfile } from "@/types/models";
import { AppState, type AppStateStatus } from "react-native";
import * as weeklyTime from "@/lib/weeklyCheckIn";
jest.mock("@/api/weeklyCheckInApi", () => ({ weeklyCheckInApi: { status: jest.fn(), save: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@/lib/targetRecalculation", () => ({ promptTargetRecalculation: jest.fn().mockResolvedValue(false) }));
const profile = { userId: "u", height: 170, currentWeight: 70, timezone: "Asia/Ho_Chi_Minh" } as UserProfile;
const due = { required: true, today: "2026-10-05", weekStart: "2026-10-05", confirmedAt: null };
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, "addEventListener").mockImplementation(() => ({ remove: jest.fn() }));
  useAuthStore.setState({ user: { id: "u" } as never });
  jest.mocked(weeklyCheckInApi.status).mockResolvedValue(due);
});
it("switches weeks at local Monday midnight, including the year boundary", () => {
  expect(weekInTimezone("Asia/Ho_Chi_Minh", new Date("2026-10-04T16:59:59Z"))).toBe("2026-09-28");
  expect(weekInTimezone("Asia/Ho_Chi_Minh", new Date("2026-10-04T17:00:00Z"))).toBe("2026-10-05");
  expect(weekInTimezone("America/Los_Angeles", new Date("2026-10-04T17:00:00Z"))).toBe("2026-09-28");
  expect(weekInTimezone("Asia/Ho_Chi_Minh", new Date("2027-01-01T03:00:00Z"))).toBe("2026-12-28");
});
it("requires a new weight and saves both measurements before unlocking", async () => {
  jest.mocked(weeklyCheckInApi.save).mockResolvedValue({ status: { ...due, required: false }, profile: { ...profile, currentWeight: 69.5 }, measurement: {} as never });
  await render(<WeeklyCheckInGate profile={profile} />);
  await screen.findByText("Cập nhật số đo tuần này");
  expect(screen.getByLabelText("Chiều cao").props.value).toBe("170");
  await fireEvent.press(screen.getByRole("button", { name: "Lưu số đo và tiếp tục" }));
  expect(weeklyCheckInApi.save).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Cân nặng"), "69,5");
  await fireEvent.press(screen.getByRole("button", { name: "Lưu số đo và tiếp tục" }));
  expect(weeklyCheckInApi.save).toHaveBeenCalledWith({ weight: 69.5, height: 170 });
  expect(screen.queryByText("Cập nhật số đo tuần này")).toBeNull();
});
it("keeps the form and its values when saving fails", async () => {
  jest.mocked(weeklyCheckInApi.save).mockRejectedValue(new Error("offline"));
  await render(<WeeklyCheckInGate profile={profile} />);
  await screen.findByText("Cập nhật số đo tuần này");
  await fireEvent.changeText(screen.getByLabelText("Cân nặng"), "69");
  await fireEvent.press(screen.getByRole("button", { name: "Lưu số đo và tiếp tục" }));
  expect(screen.getByText("Cập nhật số đo tuần này")).toBeTruthy();
  expect(screen.getByLabelText("Cân nặng").props.value).toBe("69");
});
it("does not prompt again when the server reports this week completed", async () => {
  jest.mocked(weeklyCheckInApi.status).mockResolvedValue({ ...due, required: false });
  await render(<WeeklyCheckInGate profile={profile} />);
  await act(async () => {});
  expect(screen.queryByText("Cập nhật số đo tuần này")).toBeNull();
});
it("rechecks on foreground and blocks again for a new week", async () => {
  let foreground!: (state: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
    foreground = callback; return { remove: jest.fn() };
  });
  try {
    jest.mocked(weeklyCheckInApi.status).mockResolvedValueOnce({ ...due, required: false }).mockResolvedValueOnce({ ...due, weekStart: "2026-10-12" });
    const view = await render(<WeeklyCheckInGate profile={profile} />);
    expect(screen.queryByText("Cập nhật số đo tuần này")).toBeNull();
    await act(() => foreground("active"));
    expect(screen.getByText("Tuần bắt đầu 2026-10-12")).toBeTruthy();
    await view.unmount();
  } finally { listener.mockRestore(); }
});
it("can retry a failed status check without bypassing the required form", async () => {
  jest.mocked(weeklyCheckInApi.status).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(due);
  await render(<WeeklyCheckInGate profile={profile} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Thử lại" }));
  expect(screen.getByText("Cập nhật số đo tuần này")).toBeTruthy();
});
it("detects a new week while the app stays open without polling the server every minute", async () => {
  const week = jest.spyOn(weeklyTime, "weekInTimezone").mockReturnValue("2026-10-05");
  const timer = jest.spyOn(global, "setInterval");
  const previous = AppState.currentState;
  AppState.currentState = "active";
  try {
    jest.mocked(weeklyCheckInApi.status).mockResolvedValueOnce({ ...due, required: false }).mockResolvedValueOnce({ ...due, weekStart: "2026-10-12" });
    const view = await render(<WeeklyCheckInGate profile={profile} />);
    const tick = timer.mock.calls.find(([, ms]) => ms === 60_000)![0] as () => void;
    await act(() => tick());
    expect(weeklyCheckInApi.status).toHaveBeenCalledTimes(1);
    week.mockReturnValue("2026-10-12");
    await act(() => tick());
    expect(weeklyCheckInApi.status).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Tuần bắt đầu 2026-10-12")).toBeTruthy();
    await view.unmount();
  } finally { week.mockRestore(); timer.mockRestore(); AppState.currentState = previous; }
});
