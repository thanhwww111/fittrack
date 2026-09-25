import { create } from "zustand";
import { goalApi, profileApi } from "@/api/profileApi";
import type { NutritionTarget, UpdateProfileInput, UserProfile } from "@/types/models";

interface ProfileState {
  profile: UserProfile | null;
  currentTarget: NutritionTarget | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
  // Tính lại target từ profile (AUTO). Hôm nay đã có target thì cập nhật target đó.
  recalculateTarget: () => Promise<NutritionTarget>;
  reset: () => void;
}

const initialState = { profile: null, currentTarget: null, isLoading: false, error: null };

export const useProfileStore = create<ProfileState>()((set, get) => ({
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

  recalculateTarget: async () => {
    const { currentTarget } = get();
    const goals = await goalApi.list();

    let target: NutritionTarget;
    if (currentTarget && currentTarget.effectiveFrom === goals.today) {
      target = await goalApi.update(currentTarget.id, { mode: "AUTO" });
    } else {
      target = await goalApi.createAuto();
    }

    set({ currentTarget: target });
    return target;
  },

  reset: () => set(initialState),
}));
