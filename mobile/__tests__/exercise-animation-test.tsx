import { act, render } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { ExerciseAnimation } from "@/components/workout/ExerciseAnimation";

it("stops its animation timer when paused, backgrounded or unmounted", async () => {
  let onState!: (state: AppStateStatus) => void;
  const original = AppState.currentState;
  AppState.currentState = "active";
  const remove = jest.fn();
  const listener = jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
    onState = callback; return { remove };
  });
  const start = jest.spyOn(global, "setInterval");
  const stop = jest.spyOn(global, "clearInterval");
  try {
    const view = await render(<ExerciseAnimation movement="squat" playing speed={1} label="Squat" />);
    const timer = start.mock.results.at(-1)!.value;
    await act(() => onState("background"));
    expect(stop).toHaveBeenCalledWith(timer);
    await act(() => onState("active"));
    const resumed = start.mock.results.at(-1)!.value;
    expect(resumed).not.toBe(timer);
    await view.rerender(<ExerciseAnimation movement="squat" playing={false} speed={1} label="Squat" />);
    expect(stop).toHaveBeenCalledWith(resumed);
    await view.rerender(<ExerciseAnimation movement="squat" playing speed={0.5} label="Squat" />);
    const slow = start.mock.results.at(-1)!.value;
    await view.unmount();
    expect(stop).toHaveBeenCalledWith(slow);
    expect(remove).toHaveBeenCalled();
  } finally {
    listener.mockRestore(); start.mockRestore(); stop.mockRestore(); AppState.currentState = original;
  }
});
