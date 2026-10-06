import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useDashboard } from "@/hooks/useDashboard";
import { useProgress } from "@/hooks/useProgress";
import { useProfileStore } from "@/stores/profileStore";
import { progressApi } from "@/api/progressApi";
import type { UserProfile } from "@/types/models";
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual("react"); React.useEffect(callback, [callback]);
} }));
jest.mock("@/api/nutritionApi", () => ({ nutritionApi: { today: jest.fn().mockResolvedValue({}) } }));
jest.mock("@/api/workoutApi", () => ({ sessionApi: { today: jest.fn().mockResolvedValue({}) } }));
jest.mock("@/api/progressApi", () => ({ progressApi: {
  weekly: jest.fn().mockResolvedValue({}), weight: jest.fn().mockResolvedValue({}),
  workout: jest.fn().mockResolvedValue({ weeks: [] }), nutrition: jest.fn().mockResolvedValue({}), goal: jest.fn().mockResolvedValue({}),
} }));
jest.mock("@/stores/notificationStore", () => ({ useNotificationStore: { getState: () => ({ refreshNutritionReminders: jest.fn() }) } }));
it("refreshes mounted dashboard and progress after weekly measurements update the profile", async () => {
  useProfileStore.setState({ profile: { updatedAt: "before" } as UserProfile });
  const view = await renderHook(() => ({ dashboard: useDashboard(), progress: useProgress("1m") }));
  await waitFor(() => expect(view.result.current.dashboard.isLoading).toBe(false));
  expect(progressApi.weekly).toHaveBeenCalledTimes(1);
  expect(progressApi.weight).toHaveBeenCalledTimes(1);
  await act(() => useProfileStore.setState({ profile: { updatedAt: "after" } as UserProfile }));
  expect(progressApi.weekly).toHaveBeenCalledTimes(2);
  expect(progressApi.weight).toHaveBeenCalledTimes(2);
  await view.unmount();
  useProfileStore.setState({ profile: { updatedAt: "unmounted" } as UserProfile });
  expect(progressApi.weekly).toHaveBeenCalledTimes(2);
});
