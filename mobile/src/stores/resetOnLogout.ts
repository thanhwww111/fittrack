import { useAuthStore } from "./authStore";
import { useNutritionStore } from "./nutritionStore";
import { useProfileStore } from "./profileStore";

// Xoá dữ liệu của mọi store khi rời phiên (bấm đăng xuất hoặc refresh token hết hạn),
// để user đăng nhập sau trên cùng máy không thấy dữ liệu của người trước
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated && !state.isAuthenticated) {
    useProfileStore.getState().reset();
    useNutritionStore.getState().reset();
  }
});
