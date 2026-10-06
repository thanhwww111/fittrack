import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { CreateExerciseForm } from "@/components/workout/CreateExerciseForm";
import { ExerciseNote } from "@/components/workout/ExerciseNote";
import { EXERCISE_NOTES, matchesExercise } from "@/lib/exerciseNames";
import { useLanguageStore } from "@/stores/languageStore";
afterEach(() => useLanguageStore.setState({ locale: "vi" }));
it("updates muscle and equipment choices without clearing an exercise draft", async () => {
  await render(<CreateExerciseForm onSaved={jest.fn()} onCancel={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText("Tên bài tập"), "Buổi tập riêng");
  expect(screen.getByRole("radio", { name: "Ngực" })).toBeTruthy();
  await act(() => useLanguageStore.setState({ locale: "en" }));
  expect(screen.getByRole("radio", { name: "Chest" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Barbell" })).toBeTruthy();
  expect(screen.getByLabelText("Exercise name").props.value).toBe("Buổi tập riêng");
});
it("explains the English exercise in Vietnamese and responds to language changes", async () => {
  await render(<ExerciseNote name="Bench Press" />);
  expect(screen.getByText("Đẩy ngực với tạ đòn trên ghế ngang")).toBeTruthy();
  await act(() => useLanguageStore.setState({ locale: "en" }));
  expect(screen.queryByText("Đẩy ngực với tạ đòn trên ghế ngang")).toBeNull();
});
it("does not invent notes for unknown or custom exercises", async () => {
  await render(<ExerciseNote name="Bench Press" isCustom />);
  expect(screen.queryByText("Đẩy ngực với tạ đòn trên ghế ngang")).toBeNull();
});
it("finds canonical exercises using English or Vietnamese with or without accents", () => {
  expect(Object.keys(EXERCISE_NOTES)).toHaveLength(18);
  expect(matchesExercise({ name: "Bench Press" }, "day nguc")).toBe(true);
  expect(matchesExercise({ name: "Pull-up" }, "hít xà")).toBe(true);
  expect(matchesExercise({ name: "Bench Press" }, "bench")).toBe(true);
  expect(matchesExercise({ name: "Custom exercise", isCustom: true }, "đẩy ngực")).toBe(false);
});
