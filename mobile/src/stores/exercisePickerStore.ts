import { create } from "zustand";
import type { Exercise } from "@/types/models";

// Màn chọn bài tập dùng chung cho template editor và buổi tập đang diễn ra.
// Màn gọi đăng ký `onPick` trước khi mở picker, picker gọi lại rồi quay về.
interface ExercisePickerState {
  onPick: ((exercise: Exercise) => void) | null;
  // Bài đã có ở màn gọi, picker đánh dấu để user khỏi chọn trùng
  selectedIds: string[];
  open: (onPick: (exercise: Exercise) => void, selectedIds: string[]) => void;
  clear: () => void;
}

export const useExercisePickerStore = create<ExercisePickerState>()((set) => ({
  onPick: null,
  selectedIds: [],
  open: (onPick, selectedIds) => set({ onPick, selectedIds }),
  clear: () => set({ onPick: null, selectedIds: [] }),
}));
