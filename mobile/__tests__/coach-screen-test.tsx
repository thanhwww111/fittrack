import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import CoachScreen from '@/app/plan/coach';
import { coachApi } from '@/api/coachApi';
import { personalPlanApi } from '@/api/personalPlanApi';
import { useCoachStore, defaultCoachSettings } from '@/stores/coachStore';
import { router } from 'expo-router';
import { ApiError } from '@/api/client';
import { clearAllFormDrafts } from '@/hooks/useDraftState';
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (cb: any) => require('react').useEffect(cb, [cb]) }));
jest.mock('@/api/coachApi', () => ({ coachApi: { overview: jest.fn(), messages: jest.fn(), saveSettings: jest.fn(), send: jest.fn(), checkIn: jest.fn(), review: jest.fn() } }));
jest.mock('@/api/personalPlanApi', () => ({ personalPlanApi: { createDraft: jest.fn() } }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign((selector: any) => selector({ user: { id: 'alice' }, isAuthenticated: true }), { getState: () => ({ user: { id: 'alice' }, isAuthenticated: true }) }) }));
jest.mock('@/stores/notificationStore', () => ({ useNotificationStore: (selector: any) => selector({ push: { token: null, reason: 'denied' }, error: null }) }));
jest.mock('@/stores/personalPlanStore', () => ({ usePersonalPlanStore: (selector: any) => selector({ survey: { revision: 1 } }) }));
beforeEach(() => {
  jest.clearAllMocks(); clearAllFormDrafts(); useCoachStore.getState().reset();
  jest.mocked(coachApi.overview).mockResolvedValue({ settings: defaultCoachSettings, today: '2026-10-06', dailyAdvice: 'Take a gentle walk', weeklyReview: null, recentMessages: [] });
  jest.mocked(coachApi.messages).mockResolvedValue([{ id: 'u1', role: 'user', content: 'My previous question', createdAt: '2026-10-05T01:00:00Z' }]);
  jest.mocked(coachApi.saveSettings).mockImplementation(async value => value);
});
it.each(['DRAFT', 'DAILY', 'WEEKLY'] as const)('retains %s identity through a remount after an unknown outcome', async kind => {
  const api = kind === 'DRAFT' ? personalPlanApi.createDraft : coachApi.review;
  jest.mocked(api).mockRejectedValue(new ApiError('Request timed out'));
  const title = kind === 'DRAFT' ? 'Tạo bản nháp AI tiếp theo' : kind === 'DAILY' ? 'Phân tích hôm nay' : 'Đề xuất lịch tập cá nhân';
  const view = await render(<CoachScreen key='light' />);
  await screen.findByText('Take a gentle walk');
  await fireEvent.press(screen.getByText(title));
  await screen.findByText('Server phản hồi quá lâu, thử lại sau.');
  await view.rerender(<CoachScreen key='dark' />);
  await screen.findByText('Take a gentle walk');
  await fireEvent.press(screen.getByText(title));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  expect(jest.mocked(api).mock.calls[0][0]).toBe(jest.mocked(api).mock.calls[1][0]);
});
it('shows advice, permission status and explicitly saves opt-in', async () => {
  await render(<CoachScreen />);
  await screen.findByText('Take a gentle walk');
  expect(screen.getByText('Take a gentle walk')).toBeTruthy();
  expect(screen.getByText('Chưa cấp quyền thông báo.')).toBeTruthy();
  await fireEvent(screen.getByLabelText('Nhận nhắc nhở từ PT'), 'valueChange', true);
  await fireEvent.press(screen.getByText('Lưu cài đặt PT'));
  await waitFor(() => expect(coachApi.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ enabled: true })));
});
it('opens the returned draft for review without applying it', async () => {
  jest.mocked(personalPlanApi.createDraft).mockResolvedValue({ id: 'draft1' } as any);
  await render(<CoachScreen />); await screen.findByText('Take a gentle walk');
  await fireEvent.press(screen.getByText('Tạo bản nháp AI tiếp theo'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/plan/draft', params: { id: 'draft1' } }));
});
it('shows the returned personal schedule with duration and recovery days without applying a draft', async () => {
  jest.mocked(coachApi.review).mockResolvedValue({ content: 'A week adapted to your available time.', trainingProposal: [
    { date: '2026-10-06', activity: 'WALKING', title: 'Comfortable walk', minutes: 20, time: '18:00', templateId: null, intensity: 'EASY', rationale: 'Shorter than your 25-minute availability.' },
    ...['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'].map(date => ({ date, activity: 'REST' as const, title: 'Recovery', minutes: 0, time: null, templateId: null, intensity: 'EASY' as const, rationale: 'Outside your declared training days.' })),
  ] });
  await render(<CoachScreen />); await screen.findByText('Take a gentle walk');
  await fireEvent.press(screen.getByText('Đề xuất lịch tập cá nhân'));
  await screen.findByText('Comfortable walk · 20 phút · 18:00');
  expect(screen.getByText('2026-10-07 · Nghỉ phục hồi')).toBeTruthy();
  expect(screen.getByText('Shorter than your 25-minute availability.')).toBeTruthy();
  expect(personalPlanApi.createDraft).not.toHaveBeenCalled();
});
it('keeps draft identity after unknown outcome and replaces it only for a confirmed failure', async () => {
  jest.mocked(personalPlanApi.createDraft).mockRejectedValueOnce(new ApiError('Request timed out')).mockRejectedValueOnce(new ApiError('AI failed', 502, { code: 'PLAN_GENERATION_FAILED' })).mockResolvedValue({ id: 'new-plan' } as any);
  await render(<CoachScreen />); await screen.findByText('Take a gentle walk');
  await fireEvent.press(screen.getByText('Tạo bản nháp AI tiếp theo'));
  await screen.findByText('Server phản hồi quá lâu, thử lại sau.');
  await fireEvent.press(screen.getByText('Tạo bản nháp AI tiếp theo'));
  await fireEvent.press(await screen.findByText('Bắt đầu yêu cầu AI mới'));
  await fireEvent.press(screen.getByText('Tạo bản nháp AI tiếp theo'));
  await waitFor(() => expect(personalPlanApi.createDraft).toHaveBeenCalledTimes(3));
  const calls = jest.mocked(personalPlanApi.createDraft).mock.calls;
  expect(calls[0][0]).toBe(calls[1][0]); expect(calls[2][0]).not.toBe(calls[1][0]);
});
