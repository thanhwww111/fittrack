import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import ProgramScreen from "@/app/workout/program";
import { programApi, templateApi } from "@/api/workoutApi";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { WorkoutTemplate } from "@/types/models";

let mockParams: { id?: string } = {};

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock("@/api/workoutApi", () => ({
  templateApi: { list: jest.fn(), create: jest.fn(), applySuggestion: jest.fn() },
  programApi: { create: jest.fn(), get: jest.fn(), update: jest.fn() },
}));

const push: WorkoutTemplate = { id: "push", name: "Ngực – Tay sau", exercises: [], updatedAt: "2026-09-30T00:00:00Z" };
const pull: WorkoutTemplate = { id: "pull", name: "Lưng xô – Tay trước", exercises: [], updatedAt: "2026-09-30T00:00:00Z" };
const legs: WorkoutTemplate = { id: "legs", name: "Chân (Legs)", exercises: [], updatedAt: "2026-09-30T00:00:00Z" };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  useWorkoutStore.getState().reset();
});

it("always offers three suggested sessions even without saved templates, creating only selected distinct sessions", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([]);
  jest.mocked(templateApi.applySuggestion).mockResolvedValue(pull);
  await render(<ProgramScreen />);
  expect(screen.getAllByRole("radio", { name: "Ngực vai tay sau" })).toHaveLength(7);
  expect(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })).toHaveLength(7);
  expect(screen.getAllByRole("radio", { name: "Chân bụng" })).toHaveLength(7);
  expect(templateApi.applySuggestion).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Tên lịch"), "Tuần mới");
  await fireEvent.press(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })[0]);
  await fireEvent.press(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })[3]);
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await waitFor(() => expect(programApi.create).toHaveBeenCalledWith({
    name: "Tuần mới", days: [{ dayOfWeek: 1, templateId: "pull" }, { dayOfWeek: 4, templateId: "pull" }],
  }));
  expect(templateApi.applySuggestion).toHaveBeenCalledTimes(1);
  expect(templateApi.applySuggestion).toHaveBeenCalledWith("pull");
});

it("reuses resolved suggestions after a failed program save", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([]);
  jest.mocked(templateApi.applySuggestion).mockResolvedValue(legs);
  jest.mocked(programApi.create).mockRejectedValueOnce(new Error("offline"));
  await render(<ProgramScreen />);
  await fireEvent.changeText(screen.getByLabelText("Tên lịch"), "Tuần mới");
  await fireEvent.press(screen.getAllByRole("radio", { name: "Chân bụng" })[1]);
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await screen.findByText("Đã có lỗi xảy ra, thử lại sau.");
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await waitFor(() => expect(programApi.create).toHaveBeenCalledTimes(2));
  expect(templateApi.applySuggestion).toHaveBeenCalledTimes(1);
});

it("reuses a saved suggested template without duplicate choices or another apply request", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([{ ...pull, name: "Lưng xô tay trước", suggestedKey: "pull" }]);
  await render(<ProgramScreen />);
  expect(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })).toHaveLength(7);
  await fireEvent.changeText(screen.getByLabelText("Tên lịch"), "Tuần mới");
  await fireEvent.press(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })[2]);
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await waitFor(() => expect(programApi.create).toHaveBeenCalledWith({
    name: "Tuần mới", days: [{ dayOfWeek: 3, templateId: "pull" }],
  }));
  expect(templateApi.applySuggestion).not.toHaveBeenCalled();
});

it("keeps a suggestion selected when the template list refreshes", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([]);
  await render(<ProgramScreen />);
  await fireEvent.press(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })[2]);
  jest.mocked(templateApi.list).mockResolvedValue([{ ...pull, name: "Lưng xô tay trước", suggestedKey: "pull" }]);
  await act(async () => useWorkoutStore.getState().loadTemplates());
  expect(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })[2]).toBeSelected();
});

it("keeps the draft and does not submit a program if a suggested session cannot be created", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([]);
  jest.mocked(templateApi.applySuggestion).mockRejectedValueOnce(new Error("offline"));
  await render(<ProgramScreen />);
  await fireEvent.changeText(screen.getByLabelText("Tên lịch"), "Tuần mới");
  await fireEvent.press(screen.getAllByRole("radio", { name: "Chân bụng" })[4]);
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await screen.findByText("Đã có lỗi xảy ra, thử lại sau.");
  expect(programApi.create).not.toHaveBeenCalled();
  expect(screen.getAllByRole("radio", { name: "Chân bụng" })[4]).toBeSelected();
  expect(screen.getByLabelText("Tên lịch").props.value).toBe("Tuần mới");
});

it("adds a suggestion to an existing program while preserving its custom days", async () => {
  mockParams = { id: "week" };
  jest.mocked(templateApi.list).mockResolvedValue([push]);
  jest.mocked(templateApi.applySuggestion).mockResolvedValue(pull);
  jest.mocked(programApi.get).mockResolvedValue({
    id: "week", name: "Tuần cũ", isFavorite: false, presetKey: null,
    days: [{ dayOfWeek: 1, templateId: "push", templateName: push.name, exerciseCount: 1 }],
  });
  await render(<ProgramScreen />);
  await screen.findByLabelText("Tên lịch");
  await fireEvent.press(screen.getAllByRole("radio", { name: "Lưng xô tay trước" })[2]);
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await waitFor(() => expect(programApi.update).toHaveBeenCalledWith("week", {
    name: "Tuần cũ", days: [{ dayOfWeek: 1, templateId: "push" }, { dayOfWeek: 3, templateId: "pull" }],
  }));
  expect(programApi.create).not.toHaveBeenCalled();
});

it("lets users add more workout templates with an existing schedule and keeps its draft", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([push]);
  await render(<ProgramScreen />);
  await screen.findAllByText(push.name);
  await fireEvent.changeText(screen.getByLabelText("Tên lịch"), "Lịch của tôi");
  await fireEvent.press(screen.getAllByRole("radio", { name: push.name })[0]);
  await fireEvent.press(screen.getByText("+ Thêm buổi tập"));
  expect(router.push).toHaveBeenCalledWith("/workout/template");

  // Lưu buổi mới dùng store thật, nhận lại danh sách có cả Pull và Legs.
  jest.mocked(templateApi.create).mockResolvedValue(pull);
  jest.mocked(templateApi.list).mockResolvedValue([push, pull, legs]);
  await act(async () => {
    await useWorkoutStore.getState().saveTemplate(null, { name: pull.name, exercises: [] });
  });
  expect(screen.getByLabelText("Tên lịch").props.value).toBe("Lịch của tôi");
  expect(screen.getAllByRole("radio", { name: push.name })[0]).toBeSelected();
  await fireEvent.press(screen.getAllByRole("radio", { name: pull.name })[2]);
  await fireEvent.press(screen.getAllByRole("radio", { name: legs.name })[4]);
  await fireEvent.press(screen.getByText("Lưu lịch tuần"));
  await waitFor(() => expect(programApi.create).toHaveBeenCalledWith({
    name: "Lịch của tôi", days: [
      { dayOfWeek: 1, templateId: "push" },
      { dayOfWeek: 3, templateId: "pull" },
      { dayOfWeek: 5, templateId: "legs" },
    ],
  }));
});

it("offers workout creation when no templates exist", async () => {
  jest.mocked(templateApi.list).mockResolvedValue([]);
  await render(<ProgramScreen />);
  await fireEvent.press(screen.getByText("+ Thêm buổi tập"));
  expect(router.push).toHaveBeenCalledWith("/workout/template");
});
