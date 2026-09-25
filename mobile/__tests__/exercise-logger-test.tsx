import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ExerciseLogger } from "@/components/workout/ExerciseLogger";
import type { SessionExercise } from "@/types/models";

const bench: SessionExercise = {
  exerciseId: "bench",
  exerciseName: "Bench Press",
  targetSets: 3,
  targetReps: 8,
  sets: [],
};

async function setup(exercise: SessionExercise = bench) {
  const onRecord = jest.fn().mockResolvedValue(undefined);
  const onRemoveSet = jest.fn().mockResolvedValue(undefined);
  await render(<ExerciseLogger exercise={exercise} onRecord={onRecord} onRemoveSet={onRemoveSet} />);
  return { onRecord, onRemoveSet };
}

describe("ExerciseLogger", () => {
  it("prefills reps from the target and shows the next set number", async () => {
    await setup();
    expect(screen.getByText("Mục tiêu 3 × 8")).toBeTruthy();
    expect(screen.getByLabelText("Số rep Bench Press").props.value).toBe("8");
    expect(screen.getByText("Ghi set 1")).toBeTruthy();
  });

  it("prefills from the last recorded set", async () => {
    await setup({ ...bench, sets: [{ setNumber: 1, weight: 60, reps: 7, completed: true }] });
    expect(screen.getByLabelText("Mức tạ Bench Press").props.value).toBe("60");
    expect(screen.getByLabelText("Số rep Bench Press").props.value).toBe("7");
    expect(screen.getByText("Ghi set 2")).toBeTruthy();
  });

  it("records a set, accepting a comma as decimal separator", async () => {
    const { onRecord } = await setup();
    await fireEvent.changeText(screen.getByLabelText("Mức tạ Bench Press"), "62,5");
    await fireEvent.press(screen.getByText("Ghi set 1"));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith({ weight: 62.5, reps: 8, setNumber: undefined }));
  });

  it("rejects invalid reps without calling the API", async () => {
    const { onRecord } = await setup();
    await fireEvent.changeText(screen.getByLabelText("Số rep Bench Press"), "0");
    await fireEvent.press(screen.getByText("Ghi set 1"));
    expect(await screen.findByText("Số rep phải là số nguyên từ 1")).toBeTruthy();
    expect(onRecord).not.toHaveBeenCalled();
  });

  it("edits an existing set when it is tapped", async () => {
    const { onRecord } = await setup({
      ...bench,
      sets: [
        { setNumber: 1, weight: 60, reps: 8, completed: true },
        { setNumber: 2, weight: 60, reps: 6, completed: true },
      ],
    });
    await fireEvent.press(screen.getByLabelText("Sửa set 1"));
    await fireEvent.changeText(screen.getByLabelText("Số rep Bench Press"), "9");
    await fireEvent.press(screen.getByText("Lưu set 1"));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith({ weight: 60, reps: 9, setNumber: 1 }));
  });

  it("removes a set", async () => {
    const { onRemoveSet } = await setup({
      ...bench,
      sets: [{ setNumber: 1, weight: 60, reps: 8, completed: true }],
    });
    await fireEvent.press(screen.getByLabelText("Xoá set 1"));
    await waitFor(() => expect(onRemoveSet).toHaveBeenCalledWith(1));
  });
});
