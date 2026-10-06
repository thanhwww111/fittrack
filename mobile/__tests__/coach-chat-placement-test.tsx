import { render, screen } from '@testing-library/react-native';
import CoachScreen from '@/app/plan/coach';
import { coachApi } from '@/api/coachApi';
import { useCoachStore, defaultCoachSettings } from '@/stores/coachStore';
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (cb: any) => require('react').useEffect(cb, [cb]) }));
jest.mock('@/api/coachApi', () => ({ coachApi: { overview: jest.fn(), messages: jest.fn() } }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign((s: any) => s({ user: { id: 'alice' }, isAuthenticated: true }), { getState: () => ({ user: { id: 'alice' }, isAuthenticated: true }) }) }));
jest.mock('@/stores/notificationStore', () => ({ useNotificationStore: (s: any) => s({ push: { reason: 'denied' }, error: null }) }));
jest.mock('@/stores/personalPlanStore', () => ({ usePersonalPlanStore: (s: any) => s({ survey: null }) }));
it('keeps PT planning and settings on the page without an embedded chat composer', async () => {
  useCoachStore.getState().reset();
  jest.mocked(coachApi.overview).mockResolvedValue({ settings: defaultCoachSettings, today: '2026-10-06', dailyAdvice: 'Personal advice', weeklyReview: null, recentMessages: [] });
  jest.mocked(coachApi.messages).mockResolvedValue([]);
  await render(<CoachScreen />);
  await screen.findByText('Personal advice');
  expect(screen.queryByLabelText('Tin nhắn cho PT')).toBeNull();
  expect(screen.getByText('Đề xuất lịch tập cá nhân')).toBeTruthy();
  expect(screen.getByText('Cài đặt PT chủ động')).toBeTruthy();
});
