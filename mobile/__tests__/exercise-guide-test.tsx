import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { ExerciseGuideButton } from "@/components/workout/ExerciseGuideButton";
import { exerciseGuides, getExerciseGuide } from "@/lib/exerciseGuides";
import { EXERCISE_NOTES } from "@/lib/exerciseNames";
import { useLanguageStore } from "@/stores/languageStore";
import { ExerciseLogger } from "@/components/workout/ExerciseLogger";
import { interpolatePose, motions } from "@/lib/exerciseMotion";
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

afterEach(() => useLanguageStore.setState({ locale: "vi" }));
it("respects reduced motion and can still be played manually", async () => {
  const reduced = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  try {
    await render(<ExerciseGuideButton name="Squat" />);
    await fireEvent.press(screen.getByRole("button", { name: "Xem động tác Squat" }));
    expect(screen.getByRole("button", { name: "Phát" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Phát" }));
    expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Đóng hướng dẫn" }));
  } finally { reduced.mockRestore(); }
});
it("opens and closes guidance without losing the workout draft", async () => {
  const onRecord = jest.fn();
  await render(<ExerciseLogger exercise={{ exerciseId: "bench", exerciseName: "Bench Press", targetSets: 3, targetReps: 8, sets: [] }}
    onRecord={onRecord} onRemoveSet={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText("Số rep Bench Press"), "12");
  await fireEvent.press(screen.getByRole("button", { name: "Xem động tác Bench Press" }));
  expect(screen.getByText("Cách thực hiện")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Đóng hướng dẫn" }));
  expect(screen.queryByText("Cách thực hiện")).toBeNull();
  expect(screen.getByLabelText("Số rep Bench Press").props.value).toBe("12");
  expect(onRecord).not.toHaveBeenCalled();
});
it("supports pause, playback speed and bilingual instructions", async () => {
  await render(<ExerciseGuideButton name="Squat" />);
  await fireEvent.press(screen.getByRole("button", { name: "Xem động tác Squat" }));
  await fireEvent.press(screen.getByRole("radio", { name: "0.5×" }));
  expect(screen.getByRole("radio", { name: "0.5×", selected: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Tạm dừng" }));
  expect(screen.getByRole("button", { name: "Phát" })).toBeTruthy();
  await act(() => useLanguageStore.setState({ locale: "en" }));
  expect(screen.getByText("How to perform")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Close guide" }));
});
it("does not substitute another movement for unknown or custom exercises", async () => {
  expect(getExerciseGuide("Unknown")).toBeNull();
  expect(getExerciseGuide("constructor")).toBeNull();
  expect(getExerciseGuide("Bench Press", true)).toBeNull();
  await render(<ExerciseGuideButton name="Bench Press" isCustom />);
  expect(screen.queryByRole("button")).toBeNull();
});
it("covers all seeded exercises with both languages", () => {
  expect(Object.keys(exerciseGuides).sort()).toEqual(Object.keys(EXERCISE_NOTES).sort());
  for (const guide of Object.values(exerciseGuides)) {
    expect(guide.steps.vi.length).toBeGreaterThanOrEqual(2);
    expect(guide.steps.en).toHaveLength(guide.steps.vi.length);
    expect(guide.tip.vi).toBeTruthy();
    expect(guide.tip.en).toBeTruthy();
    const motion = motions[guide.movement];
    expect(motion.start).not.toEqual(motion.end);
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      for (const [x, y] of Object.values(interpolatePose(motion, phase))) {
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(320);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(250);
      }
    }
  }
});
