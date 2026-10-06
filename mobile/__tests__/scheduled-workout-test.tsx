import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { ScheduledWorkoutCard } from "@/components/workout/ScheduledWorkoutCard";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { trainingScheduleApi } from "@/api/trainingScheduleApi";
import type { TrainingScheduleResponse } from "@/types/trainingSchedule";
import type { WorkoutSession } from "@/types/models";

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useFocusEffect: (cb: () => void) => {
  const React = jest.requireActual("react"); React.useEffect(cb, [cb]);
} }));
jest.mock("@/api/trainingScheduleApi", () => ({ trainingScheduleApi: { get: jest.fn(), start: jest.fn() } }));
jest.mock("@/stores/notificationStore", () => ({ useNotificationStore: { getState: () => ({ syncOnLogin: jest.fn() }) } }));
const data: TrainingScheduleResponse = { today: "2026-10-02", timezone: "Asia/Ho_Chi_Minh", pending: null,
  current: { id: "version", programId: "p", name: "Upper Lower", timezone: "Asia/Ho_Chi_Minh", effectiveFrom: "2026-10-01", days: [] },
  days: [
    { date: "2026-10-01", status: "MISSED", workout: { templateId: "upper", templateName: "Upper", exerciseCount: 6 }, sessionId: null },
    { date: "2026-10-02", status: "PLANNED", workout: { templateId: "lower", templateName: "Lower", exerciseCount: 5 }, sessionId: null },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  useTrainingScheduleStore.setState({ data, error: null, loading: false, load: jest.fn().mockResolvedValue(undefined) });
  useWorkoutStore.setState({ activeSession: null, loadActive: jest.fn().mockResolvedValue(null), pendingExercises: [] });
});
it("starts today's Lower while noting missed Upper without shifting it forward", async () => {
  const session = { id: "s", name: "Lower", status: "IN_PROGRESS", exercises: [] } as unknown as WorkoutSession;
  jest.mocked(trainingScheduleApi.start).mockResolvedValue(session);
  await render(<ScheduledWorkoutCard />);
  expect(screen.getByText("Lower")).toBeTruthy();
  expect(screen.getByText(/đã bỏ lỡ Upper/)).toBeTruthy();
  await fireEvent.press(screen.getByText("Bắt đầu buổi hôm nay"));
  expect(useWorkoutStore.getState().activeSession).toBe(session);
  expect(router.push).toHaveBeenCalledWith("/workout/start");
});
it("shows rest instead of a pinned saved template", async () => {
  useTrainingScheduleStore.setState({ data: { ...data, days: [{ ...data.days[1], status: "REST", workout: null }] } });
  await render(<ScheduledWorkoutCard />);
  expect(screen.getByText("Ngày nghỉ")).toBeTruthy();
  expect(screen.queryByText("Bắt đầu buổi hôm nay")).toBeNull();
});
it("previews Monday Upper on a rest Sunday without allowing an early start", async () => {
  useTrainingScheduleStore.setState({ data: { ...data, today: "2026-10-04", days: [
    { date: "2026-10-04", status: "REST", workout: null, sessionId: null },
    { ...data.days[0], date: "2026-10-05", status: "PLANNED" },
  ] } });
  await render(<ScheduledWorkoutCard />);
  expect(screen.getByText("Lịch tập ngày mai")).toBeTruthy();
  expect(screen.getByText("Upper")).toBeTruthy();
  expect(screen.getByText(/Thứ 2 · 2026-10-05/)).toBeTruthy();
  expect(screen.queryByText("Bắt đầu buổi hôm nay")).toBeNull();
  expect(screen.queryByText("Tiếp tục buổi tập")).toBeNull();
  expect(trainingScheduleApi.start).not.toHaveBeenCalled();
});
it("keeps Monday Upper available today even when another workout follows", async () => {
  useTrainingScheduleStore.setState({ data: { ...data, today: "2026-10-05", days: [
    { ...data.days[0], date: "2026-10-05", status: "PLANNED" },
    { ...data.days[1], date: "2026-10-06", status: "PLANNED" },
  ] } });
  await render(<ScheduledWorkoutCard />);
  expect(screen.getByText("Lịch tập hôm nay")).toBeTruthy();
  expect(screen.getByText("Upper")).toBeTruthy();
  expect(screen.getByText("Bắt đầu buổi hôm nay")).toBeTruthy();
});
it("previews tomorrow after completing today and retains today's history link", async () => {
  useTrainingScheduleStore.setState({ data: { ...data, days: [
    { ...data.days[1], status: "COMPLETED", sessionId: "done" },
    { ...data.days[0], date: "2026-10-03", status: "PLANNED" },
  ] } });
  await render(<ScheduledWorkoutCard />);
  expect(screen.getByText("Lịch tập ngày mai")).toBeTruthy();
  expect(screen.getByText("Upper")).toBeTruthy();
  expect(screen.queryByText("Bắt đầu buổi hôm nay")).toBeNull();
  await fireEvent.press(screen.getByText("Xem buổi đã hoàn thành"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/workout/session", params: { id: "done" } });
});
it("shows the actual next training date across rest days and the pending schedule name", async () => {
  useTrainingScheduleStore.setState({ data: { ...data, today: "2026-10-03",
    pending: { ...data.current!, name: "Lịch mới", effectiveFrom: "2026-10-04" }, days: [
      { date: "2026-10-03", status: "REST", workout: null, sessionId: null },
      { date: "2026-10-04", status: "REST", workout: null, sessionId: null },
      { ...data.days[0], date: "2026-10-05", status: "PLANNED" },
    ] } });
  await render(<ScheduledWorkoutCard />);
  expect(screen.getByText("Lịch tập Thứ 2 · 2026-10-05")).toBeTruthy();
  expect(screen.getByText(/Lịch mới · Thứ 2 · 2026-10-05/)).toBeTruthy();
  expect(screen.queryByText("Lịch tập ngày mai")).toBeNull();
  expect(screen.queryByText("Bắt đầu buổi hôm nay")).toBeNull();
});
it("opens an already completed session instead of starting another", async () => {
  useTrainingScheduleStore.setState({ data: { ...data, days: [{ ...data.days[1], status: "COMPLETED", sessionId: "done" }] } });
  await render(<ScheduledWorkoutCard />);
  await fireEvent.press(screen.getByText("Xem buổi đã hoàn thành"));
  expect(router.push).toHaveBeenCalledWith({ pathname: "/workout/session", params: { id: "done" } });
  expect(trainingScheduleApi.start).not.toHaveBeenCalled();
});
