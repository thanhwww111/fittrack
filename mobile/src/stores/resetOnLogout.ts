import { useAuthStore } from "./authStore";
import { useExercisePickerStore } from "./exercisePickerStore";
import { useNotificationStore } from "./notificationStore";
import { useNutritionStore } from "./nutritionStore";
import { useProfileStore } from "./profileStore";
import { useWorkoutStore } from "./workoutStore";

// Xoá dữ liệu của mọi store khi rời phiên (bấm đăng xuất hoặc refresh token hết hạn),
// để user đăng nhập sau trên cùng máy không thấy dữ liệu của người trước.
// notificationStore.reset() còn huỷ các lịch nhắc cục bộ của user cũ.
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated && !state.isAuthenticated) {
    useProfileStore.getState().reset();
    useNutritionStore.getState().reset();
    useWorkoutStore.getState().reset();
    useExercisePickerStore.getState().clear();
    useNotificationStore.getState().reset();
  }
});
