import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ScheduleSelection } from "@/components/workout/ScheduleSelection";
import { programApi } from "@/api/workoutApi";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import type { ProgramPreset, WeeklyProgram } from "@/types/models";
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/api/workoutApi", () => ({ programApi: { presets: jest.fn(), applyPreset: jest.fn(), update: jest.fn() } }));
jest.mock("@/stores/notificationStore", () => ({ useNotificationStore: Object.assign(
  (select: (state: unknown) => unknown) => select({ settings: null }),
  { getState: () => ({ syncOnLogin: jest.fn(), update: jest.fn() }) }) }));
const preset: ProgramPreset = { key: "upper-lower-4", name: "Upper Lower", description: "4 buổi", daysPerWeek: 4,
  days: [1,2,4,5].map((dayOfWeek, i) => ({ dayOfWeek, name: i % 2 ? "Lower" : "Upper", exercises: [] })) };
const program = { id: "p", name: preset.name, days: [1,2,4,5].map((dayOfWeek,i) => ({ dayOfWeek, templateId: `t${i}`, templateName: "Buổi", exerciseCount: 1 })) } as WeeklyProgram;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(programApi.presets).mockResolvedValue([preset]);
  jest.mocked(programApi.applyPreset).mockResolvedValue(program);
  jest.mocked(programApi.update).mockResolvedValue(program);
  useTrainingScheduleStore.setState({ data: null, load: jest.fn().mockResolvedValue(undefined),
    apply: jest.fn().mockResolvedValue({ current: { effectiveFrom: "2026-10-01" }, pending: null }) });
});
it("previews and saves Upper/Lower on Monday Tuesday Friday Saturday", async () => {
  const done = jest.fn();
  await render(<ScheduleSelection onApplied={done} />);
  await fireEvent.press(await screen.findByText("Upper Lower · 4 buổi"));
  expect(screen.getByRole("checkbox", { name: "Thứ 6" })).toBeChecked();
  await fireEvent.press(screen.getByText("Áp dụng lịch"));
  await waitFor(() => expect(done).toHaveBeenCalled());
  expect(programApi.update).toHaveBeenCalledWith("p", { days: [1,2,5,6].map((dayOfWeek,i) => ({ dayOfWeek, templateId: `t${i}` })) });
});
it("reuses the created program after activation fails and is retried", async () => {
  const apply = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ current: { effectiveFrom: "2026-10-01" } });
  useTrainingScheduleStore.setState({ apply });
  await render(<ScheduleSelection />);
  await fireEvent.press(await screen.findByText("Upper Lower · 4 buổi"));
  await fireEvent.press(screen.getByText("Áp dụng lịch"));
  await screen.findByText("Đã có lỗi xảy ra, thử lại sau.");
  await fireEvent.press(screen.getByText("Áp dụng lịch"));
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(2));
  expect(programApi.applyPreset).toHaveBeenCalledTimes(1);
  expect(apply.mock.calls[0]).toEqual(apply.mock.calls[1]);
});
