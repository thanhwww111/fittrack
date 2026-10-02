import { create } from 'zustand';
import { trainingScheduleApi } from '@/api/trainingScheduleApi';
import { errorMessage } from '@/lib/formErrors';
import type { TrainingScheduleResponse } from '@/types/trainingSchedule';
import { useAuthStore } from './authStore';
import { useNotificationStore } from './notificationStore';
let generation = 0;
interface ScheduleState {
  data: TrainingScheduleResponse | null; loading: boolean; error: string | null;
  load: () => Promise<void>;
  apply: (programId: string, requestId: string) => Promise<TrainingScheduleResponse>;
  reset: () => void;
}
export const useTrainingScheduleStore = create<ScheduleState>((set) => ({
  data: null, loading: false, error: null,
  load: async () => {
    const version = ++generation;
    set({ loading: true, error: null });
    try { const data = await trainingScheduleApi.get(); if (version === generation) set({ data, loading: false }); }
    catch (error) { if (version === generation) set({ error: errorMessage(error), loading: false }); }
  },
  apply: async (programId, requestId) => {
    const version = ++generation;
    const data = await trainingScheduleApi.apply(programId, requestId);
    if (version !== generation) throw new Error('Phiên đã thay đổi. Vui lòng tải lại lịch.');
    set({ data, error: null, loading: false });
    void useNotificationStore.getState().syncOnLogin();
    return data;
  },
  reset: () => { generation++; set({ data: null, loading: false, error: null }); },
}));
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || (previous.isAuthenticated && !state.isAuthenticated)) useTrainingScheduleStore.getState().reset();
});
