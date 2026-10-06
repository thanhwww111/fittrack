import { act, render, screen, waitFor } from "@testing-library/react-native";
import WorkoutDashboardScreen from "@/app/(tabs)/workout";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { trainingScheduleApi } from "@/api/trainingScheduleApi";
import type { TrainingScheduleResponse } from "@/types/trainingSchedule";
jest.mock("expo-router", () => ({
  router: { push: jest.fn() }, Link: ({ children }: { children: React.ReactNode }) => children,
  useFocusEffect: (cb: () => void) => { const React = jest.requireActual("react"); React.useEffect(cb, [cb]); },
}));
jest.mock("@/api/workoutApi", () => ({
  sessionApi: { list: jest.fn().mockResolvedValue({ items: [] }), personalRecords: jest.fn().mockResolvedValue([]) },
  programApi: { list: jest.fn().mockResolvedValue([]) },
}));
jest.mock("@/api/trainingScheduleApi", () => ({ trainingScheduleApi: { get: jest.fn() } }));
jest.mock("@/stores/notificationStore", () => ({ useNotificationStore: { getState: () => ({ syncOnLogin: jest.fn() }) } }));
const data: TrainingScheduleResponse = { today: "2026-10-05", timezone: "Asia/Ho_Chi_Minh", current: null, pending: null, days: [
  { date: "2026-10-05", status: "PLANNED", workout: { templateId: "u", templateName: "Upper", exerciseCount: 6 }, sessionId: null },
  { date: "2026-10-06", status: "PLANNED", workout: { templateId: "l", templateName: "Lower", exerciseCount: 4 }, sessionId: null },
] };
it("pull-to-refresh replaces today's completed workout with tomorrow's preview on the workout tab", async () => {
  jest.mocked(trainingScheduleApi.get).mockResolvedValue(data);
  useTrainingScheduleStore.getState().reset();
  useWorkoutStore.setState({ activeSession: null, loadActive: jest.fn().mockResolvedValue(null), loadTemplates: jest.fn().mockResolvedValue(undefined) });
  await render(<WorkoutDashboardScreen />);
  await screen.findByText("Lịch tập hôm nay");
  jest.mocked(trainingScheduleApi.get).mockResolvedValue({ ...data, days: [{ ...data.days[0], status: "COMPLETED", sessionId: "done" }, data.days[1]] });
  await act(() => screen.getByTestId("workout-dashboard").props.refreshControl.props.onRefresh());
  await waitFor(() => expect(screen.getByText("Lịch tập ngày mai")).toBeTruthy());
  expect(screen.getByText("Lower")).toBeTruthy();
  expect(screen.queryByText("Bắt đầu buổi hôm nay")).toBeNull();
});
