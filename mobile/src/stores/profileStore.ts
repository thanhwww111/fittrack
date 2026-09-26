import { create } from "zustand";
import { goalApi, profileApi } from "@/api/profileApi";
import type { Macros, NutritionTarget, UpdateProfileInput, UserProfile } from "@/types/models";

interface ProfileState {
  profile: UserProfile | null;
  currentTarget: NutritionTarget | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
  // Tính lại target từ profile (AUTO). Hôm nay đã có target thì cập nhật target đó.
  recalculateTarget: () => Promise<NutritionTarget>;
  // Tự nhập macro (MANUAL), cùng quy tắc: hôm nay đã có target thì sửa, chưa có thì tạo mới
  setManualTarget: (macros: Macros) => Promise<NutritionTarget>;
  reset: () => void;
}

const initialState = { profile: null, currentTarget: null, isLoading: false, error: null };

// Target của ngày đã qua không sửa được (giữ đúng lịch sử), nên chỉ PUT khi target bắt đầu từ hôm nay
async function saveTarget(
  set:(partial: Partial<ProfileState>) => void,
  input: Macros | { mode: "AUTO" }
) {
  // Lấy target từ server thay vì store: có thể gọi từ màn chưa tải hồ sơ (ví dụ ghi cân nặng)
  const goals = await goalApi.list();
  const currentTarget = goals.current;

  let target: NutritionTarget;
  if (currentTarget && currentTarget.effectiveFrom === goals.today) {
    target = await goalApi.update(currentTarget.id, input);
  } else if ("mode" in input) {
    target = await goalApi.createAuto();
  } else {
    target = await goalApi.createManual(input);
  }

  set({ currentTarget: target });
  return target;
}

export const useProfileStore = create<ProfileState>()((set) => ({
  ...initialState,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const [profile, goals] = await Promise.all([profileApi.get(), goalApi.list()]);
      set({ profile, currentTarget: goals.current, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  updateProfile: async (input) => {
    const profile = await profileApi.update(input);
    set({ profile });
    return profile;
  },

  recalculateTarget: () => saveTarget(set, { mode: "AUTO" }),

  setManualTarget: (macros) => saveTarget(set, macros),

  reset: () => set(initialState),
}));
