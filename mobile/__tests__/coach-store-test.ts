import { coachApi } from '@/api/coachApi';
import { useCoachStore, defaultCoachSettings } from '@/stores/coachStore';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/api/client';
import type { CoachOverview } from '@/types/coach';
jest.mock('@/api/coachApi', () => ({ coachApi: { overview: jest.fn(), messages: jest.fn(), saveSettings: jest.fn(), send: jest.fn(), checkIn: jest.fn(), review: jest.fn() } }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: { getState: jest.fn() } }));
const auth = { user: { id: 'alice' }, isAuthenticated: true };
beforeEach(() => { jest.resetAllMocks(); jest.mocked(useAuthStore.getState).mockReturnValue(auth as ReturnType<typeof useAuthStore.getState>); useCoachStore.getState().reset(); });
it('defaults to opt-out and validates settings without a request', async () => {
  expect(defaultCoachSettings).toMatchObject({ enabled: false, maxPerDay: 3, quietStart: '22:00', quietEnd: '07:00' });
  await expect(useCoachStore.getState().saveSettings({ ...defaultCoachSettings, quietStart: '99:00' })).rejects.toThrow();
  expect(coachApi.saveSettings).not.toHaveBeenCalled();
});
it('drops a stale load on account switch and reset', async () => {
  let resolve!: (value: CoachOverview) => void;
  jest.mocked(coachApi.overview).mockReturnValue(new Promise(r => { resolve = r; }));
  jest.mocked(coachApi.messages).mockResolvedValue([]);
  const pending = useCoachStore.getState().load();
  useCoachStore.getState().reset();
  resolve({ settings: defaultCoachSettings, today: '2026-10-06', dailyAdvice: 'Alice secret', weeklyReview: null, recentMessages: [] });
  await pending;
  expect(useCoachStore.getState().data).toBeNull();
});
it('preserves server chat, retries the same request, and surfaces unavailable AI', async () => {
  const message = { id: 'reply', role: 'assistant' as const, content: 'Rest today', createdAt: '2026-10-06T01:00:00Z' };
  jest.mocked(coachApi.send).mockRejectedValueOnce(new ApiError('AI unavailable', 503)).mockResolvedValue(message);
  jest.mocked(coachApi.messages).mockResolvedValue([message]);
  await expect(useCoachStore.getState().send('same-id', 'Help')).rejects.toThrow('AI unavailable');
  expect(useCoachStore.getState().error).toBeTruthy();
  await useCoachStore.getState().send('same-id', 'Help');
  expect(coachApi.send).toHaveBeenNthCalledWith(2, 'same-id', 'Help');
  expect(useCoachStore.getState().messages).toEqual([message]);
});
it('validates check-in and chat limits locally', async () => {
  await expect(useCoachStore.getState().checkIn({ energy: 0, difficulty: 3, note: '' })).rejects.toThrow();
  await expect(useCoachStore.getState().send('id', ' ')).rejects.toThrow();
  expect(coachApi.checkIn).not.toHaveBeenCalled(); expect(coachApi.send).not.toHaveBeenCalled();
});
it('does not expose a previous account mutation after account switch', async () => {
  let resolve!: (value: typeof defaultCoachSettings) => void;
  jest.mocked(coachApi.saveSettings).mockReturnValue(new Promise(r => { resolve = r; }));
  const pending = useCoachStore.getState().saveSettings({ ...defaultCoachSettings, enabled: true });
  jest.mocked(useAuthStore.getState).mockReturnValue({ ...auth, user: { id: 'bob' } } as ReturnType<typeof useAuthStore.getState>);
  useCoachStore.getState().reset();
  resolve({ ...defaultCoachSettings, enabled: true }); await pending;
  expect(useCoachStore.getState()).toMatchObject({ settings: null, busy: false, data: null });
});
it('saves check-in and displays server DAILY/WEEKLY advice', async () => {
  const data = { settings: defaultCoachSettings, today: '2026-10-06', dailyAdvice: null, weeklyReview: null, recentMessages: [] };
  useCoachStore.setState({ data });
  jest.mocked(coachApi.checkIn).mockResolvedValue(undefined);
  jest.mocked(coachApi.overview).mockResolvedValue(data);
  await useCoachStore.getState().checkIn({ energy: 4, difficulty: 2, note: 'Slept well' });
  expect(coachApi.checkIn).toHaveBeenCalledWith({ energy: 4, difficulty: 2, note: 'Slept well' });
  jest.mocked(coachApi.review).mockResolvedValueOnce({ content: 'Daily advice' }).mockResolvedValueOnce({ content: 'Weekly advice' });
  await useCoachStore.getState().review('daily-id', 'DAILY');
  await useCoachStore.getState().review('weekly-id', 'WEEKLY');
  expect(useCoachStore.getState().data).toMatchObject({ dailyAdvice: 'Daily advice', weeklyReview: 'Weekly advice' });
});
