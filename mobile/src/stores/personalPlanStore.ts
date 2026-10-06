import { create } from 'zustand';
import { personalPlanApi } from '@/api/personalPlanApi';
import { errorMessage } from '@/lib/formErrors';
import { useAuthStore } from './authStore';
import type { LifestyleSurvey, PersonalPlanResponse } from '@/types/personalPlan';
interface PlanState { data: PersonalPlanResponse | null; survey: LifestyleSurvey | null; isLoading: boolean; error: string | null; load: () => Promise<void>; reset: () => void }
const initial = { data: null, survey: null, isLoading: false, error: null };
let generation = 0;
export const usePersonalPlanStore = create<PlanState>((set) => ({
  ...initial,
  load: async () => {
    const ticket = ++generation;
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    set({ isLoading: true, error: null });
    const current = () => generation === ticket && useAuthStore.getState().user?.id === userId && useAuthStore.getState().isAuthenticated;
    try {
      const [data, survey] = await Promise.all([personalPlanApi.current(), personalPlanApi.survey()]);
      if (current()) set({ data, survey, isLoading: false, error: null });
    } catch (error) { if (current()) set({ isLoading: false, error: errorMessage(error) }); }
  },
  reset: () => { generation++; set(initial); },
}));
