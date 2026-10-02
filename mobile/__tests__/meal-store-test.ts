import { mealApi } from "@/api/nutritionApi";
import { DEFAULT_MEALS } from "@/lib/nutrition";
import { useMealStore } from "@/stores/mealStore";
import type { MealOption } from "@/types/models";

jest.mock("@/api/nutritionApi", () => ({ mealApi: { list: jest.fn(), create: jest.fn() } }));
const custom: MealOption = { id: "CUSTOM_123456789012345678901234", name: "Sau tập", isCustom: true };
beforeEach(() => { jest.clearAllMocks(); useMealStore.getState().reset(); });

it("ignores a previous account's pending response after logout", async () => {
  let resolve!: (meals: MealOption[]) => void;
  jest.mocked(mealApi.list).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  const oldRequest = useMealStore.getState().load();
  useMealStore.getState().reset();
  resolve([...DEFAULT_MEALS, custom]);
  await oldRequest;
  expect(useMealStore.getState().meals).toEqual(DEFAULT_MEALS);
  expect(useMealStore.getState().loaded).toBe(false);
});

it("preserves a newly created meal when an older list response arrives", async () => {
  let resolve!: (meals: MealOption[]) => void;
  jest.mocked(mealApi.list).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  jest.mocked(mealApi.create).mockResolvedValue(custom);
  const request = useMealStore.getState().load();
  await useMealStore.getState().add("Sau tập");
  resolve(DEFAULT_MEALS);
  await request;
  expect(useMealStore.getState().meals).toEqual([...DEFAULT_MEALS, custom]);
});

it("does not add duplicate or rejected meals", async () => {
  jest.mocked(mealApi.create).mockRejectedValue(new Error("duplicate"));
  await expect(useMealStore.getState().add("Bữa sáng")).rejects.toThrow();
  expect(useMealStore.getState().meals).toEqual(DEFAULT_MEALS);
});
