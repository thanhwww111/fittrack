import { create } from 'zustand';
import { coachApi } from '@/api/coachApi';
import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/formErrors';
import { useAuthStore } from './authStore';
import type { CoachSettings, CoachOverview, CoachMessage, CoachCheckIn, CoachReviewKind } from '@/types/coach';
export const defaultCoachSettings: CoachSettings = { enabled: false, maxPerDay: 3, quietStart: '22:00', quietEnd: '07:00', language: 'vi', tone: 'FIRM', snoozedUntil: null };
interface CoachState {
  data: CoachOverview | null; settings: CoachSettings | null; messages: CoachMessage[];
  isLoading: boolean; busy: boolean; error: string | null;
  load: () => Promise<void>; saveSettings: (settings: CoachSettings) => Promise<void>;
  send: (requestId: string, text: string) => Promise<void>; checkIn: (input: CoachCheckIn) => Promise<void>;
  review: (requestId: string, kind: CoachReviewKind) => Promise<void>; reset: () => void;
}
const initial = { data: null, settings: null, messages: [], isLoading: false, busy: false, error: null };
let generation = 0; let loadVersion = 0;
function session() {
  const version = generation; const id = useAuthStore.getState().user?.id;
  if (!id || !useAuthStore.getState().isAuthenticated) throw new ApiError('Phiên đăng nhập đã kết thúc.');
  return () => version === generation && id === useAuthStore.getState().user?.id && useAuthStore.getState().isAuthenticated;
}
function validateSettings(value: CoachSettings) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (typeof value.enabled !== 'boolean' || ![1, 2, 3, 5].includes(value.maxPerDay) || !time.test(value.quietStart) || !time.test(value.quietEnd) || !['vi', 'en'].includes(value.language) || !['GENTLE', 'FIRM'].includes(value.tone) || (value.snoozedUntil !== null && !Number.isFinite(Date.parse(value.snoozedUntil)))) throw new ApiError('Kiểm tra giờ HH:mm và cài đặt PT.');
}
export const useCoachStore = create<CoachState>((set, get) => {
  async function mutate(task: (current: () => boolean) => Promise<void>) {
    if (get().busy) throw new ApiError('PT đang xử lý.');
    const current = session(); ++loadVersion; set({ busy: true, isLoading: false, error: null });
    try { await task(current); }
    catch (error) { if (current()) set({ error: errorMessage(error) }); throw error; }
    finally { if (current()) set({ busy: false }); }
  }
  return {
    ...initial,
    load: async () => {
      if (get().busy) return;
      let current: () => boolean; try { current = session(); } catch { return; }
      const version = ++loadVersion; set({ isLoading: true, error: null });
      try {
        const [data, messages] = await Promise.all([coachApi.overview(), coachApi.messages()]);
        if (current() && version === loadVersion) set({ data, settings: data.settings, messages, isLoading: false });
      } catch (error) { if (current() && version === loadVersion) set({ isLoading: false, error: errorMessage(error) }); }
    },
    saveSettings: async settings => { validateSettings(settings); await mutate(async current => { const saved = await coachApi.saveSettings(settings); if (current()) set({ settings: saved, data: get().data ? { ...get().data!, settings: saved } : null }); }); },
    send: async (requestId, text) => {
      if (!requestId || !text.trim() || text.length > 2000) throw new ApiError('Nhập tin nhắn từ 1 đến 2000 ký tự.');
      await mutate(async current => {
        const reply = await coachApi.send(requestId, text.trim());
        if (!current()) return;
        // Keep the confirmed reply even if refreshing persisted history fails.
        set({ messages: [...get().messages.filter(m => m.id !== reply.id), reply] });
        const messages = await coachApi.messages(); if (current()) set({ messages });
      });
    },
    checkIn: async input => {
      if (![input.energy, input.difficulty].every(v => Number.isInteger(v) && v >= 1 && v <= 5) || input.note.length > 1000) throw new ApiError('Chọn mức 1–5 và ghi chú tối đa 1000 ký tự.');
      await mutate(async current => { await coachApi.checkIn(input); if (current()) { const data = await coachApi.overview(); if (current()) set({ data, settings: data.settings }); } });
    },
    review: async (requestId, kind) => { await mutate(async current => { const result = await coachApi.review(requestId, kind); if (current() && get().data) set({ data: { ...get().data!, [kind === 'DAILY' ? 'dailyAdvice' : 'weeklyReview']: result.content, ...(kind === 'WEEKLY' ? { trainingProposal: result.trainingProposal ?? null } : {}) } }); }); },
    reset: () => { generation++; loadVersion++; set(initial); },
  };
});
