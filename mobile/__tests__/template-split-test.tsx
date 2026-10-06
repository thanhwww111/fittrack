import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TemplateEditorScreen from "@/app/workout/template";
import { exerciseApi, programApi } from "@/api/workoutApi";
import { clearAllDrafts } from "@/lib/formDrafts";
import { useWorkoutStore } from "@/stores/workoutStore";
jest.mock("expo-router", () => ({ router: { back: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => ({}) }));
jest.mock("@/api/workoutApi", () => ({ templateApi: {}, exerciseApi: { list: jest.fn() }, programApi: { presets: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); clearAllDrafts(); });
it.each([ ["Upper (thân trên)", "Bench Press", "bench"], ["Lower (thân dưới)", "Squat", "squat"] ])(
  "fills %s without saving until requested", async (label, exerciseName, exerciseId) => {
    jest.mocked(programApi.presets).mockResolvedValue([{ key: "upper-lower-4", name: "UL", description: "", daysPerWeek: 2,
      days: ["Bench Press", "Squat"].map((name, i) => ({ dayOfWeek: i + 1, name, exercises: [{ name, sets: 4, reps: 6, rest: 120 }] })) }]);
    jest.mocked(exerciseApi.list).mockResolvedValue([
      { id: "bench", name: "Bench Press", description: "", isCustom: false, muscleGroup: "CHEST", equipment: "BARBELL" },
      { id: "squat", name: "Squat", description: "", isCustom: false, muscleGroup: "LEGS", equipment: "BARBELL" },
    ]);
    const save = jest.fn().mockResolvedValue(undefined);
    useWorkoutStore.setState({ saveTemplate: save });
    await render(<TemplateEditorScreen />);
    await fireEvent.press(screen.getByText(label));
    await waitFor(() => expect(screen.getByLabelText("Tên template").props.value).toBe(label));
    expect(screen.getByLabelText(`Set của ${exerciseName}`).props.value).toBe("4");
    expect(save).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Lưu template"));
    await waitFor(() => expect(save).toHaveBeenCalledWith(null, { name: label, exercises: [{ exerciseId, targetSets: 4, targetReps: 6, restSeconds: 120 }] }));
  });
it("keeps the entered name on a loading failure", async () => {
  jest.mocked(programApi.presets).mockRejectedValue(new Error("offline"));
  await render(<TemplateEditorScreen />);
  await fireEvent.changeText(screen.getByLabelText("Tên template"), "Buổi của tôi");
  await fireEvent.press(screen.getByText("Upper (thân trên)"));
  await screen.findByText("Chưa tải được bộ bài tập. Kiểm tra kết nối và thư viện bài tập, rồi thử lại.");
  expect(screen.getByLabelText("Tên template").props.value).toBe("Buổi của tôi");
});
