import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FloatingCoachChat } from '@/components/coach/FloatingCoachChat';
import { coachApi } from '@/api/coachApi';
import { ApiError } from '@/api/client';
import { useCoachStore, defaultCoachSettings } from '@/stores/coachStore';
import { clearAllFormDrafts } from '@/hooks/useDraftState';
let mockAccount = { user: { id: 'alice' }, isAuthenticated: true };
jest.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign((s: any) => s(mockAccount), { getState: () => mockAccount }) }));
jest.mock('@/api/coachApi', () => ({ coachApi: { overview: jest.fn(), messages: jest.fn(), send: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 12, left: 0, right: 0 }) }));
beforeEach(() => {
  mockAccount = { user: { id: 'alice' }, isAuthenticated: true };
  jest.clearAllMocks(); clearAllFormDrafts(); useCoachStore.getState().reset();
  jest.mocked(coachApi.overview).mockResolvedValue({ settings: defaultCoachSettings, today: '2026-10-06', dailyAdvice: null, weeklyReview: null, recentMessages: [] });
  jest.mocked(coachApi.messages).mockResolvedValue([{ id: 'old', role: 'user', content: 'Previous conversation', createdAt: '2026-10-05T01:00:00Z' }]);
});
async function open() {
  await fireEvent.press(screen.getByLabelText('Mở trò chuyện với PT'));
  await screen.findByText('Previous conversation');
}
it('opens above the current screen and preserves a draft while minimized', async () => {
  await render(<FloatingCoachChat />); await open();
  await fireEvent.changeText(screen.getByLabelText('Tin nhắn cho PT'), 'Plan my five days');
  await fireEvent.press(screen.getByLabelText('Thu gọn trò chuyện'));
  expect(screen.queryByLabelText('Tin nhắn cho PT')).toBeNull();
  await open();
  expect(screen.getByLabelText('Tin nhắn cho PT').props.value).toBe('Plan my five days');
});
it('uses the same request after a network failure and remount, and starts a new one only after confirmed failure', async () => {
  jest.mocked(coachApi.send).mockRejectedValueOnce(new ApiError('Request timed out')).mockRejectedValueOnce(new ApiError('Failed', 502, { code: 'COACH_REQUEST_FAILED' })).mockResolvedValue({ id: 'reply', role: 'assistant', content: 'Personal reply', createdAt: '2026-10-06T01:00:00Z' });
  const view = await render(<FloatingCoachChat key='first' />); await open();
  await fireEvent.changeText(screen.getByLabelText('Tin nhắn cho PT'), 'Help me');
  await fireEvent.press(screen.getByText('Gửi tin nhắn'));
  await screen.findByText('Server phản hồi quá lâu, thử lại sau.');
  await view.rerender(<FloatingCoachChat key='second' />); await open();
  await fireEvent.press(screen.getByText('Gửi tin nhắn'));
  await fireEvent.press(await screen.findByText('Bắt đầu yêu cầu AI mới'));
  await fireEvent.press(screen.getByText('Gửi tin nhắn'));
  await waitFor(() => expect(coachApi.send).toHaveBeenCalledTimes(3));
  const calls = jest.mocked(coachApi.send).mock.calls;
  expect(calls[0][0]).toBe(calls[1][0]); expect(calls[2][0]).not.toBe(calls[1][0]);
  await waitFor(() => expect(screen.getByLabelText('Tin nhắn cho PT').props.value).toBe(''));
});
it('hides immediately on logout and does not expose another account’s draft', async () => {
  const view = await render(<FloatingCoachChat key='alice' />); await open();
  await fireEvent.changeText(screen.getByLabelText('Tin nhắn cho PT'), 'Private draft');
  mockAccount = { user: { id: 'alice' }, isAuthenticated: false };
  await view.rerender(<FloatingCoachChat key='anonymous' />);
  expect(screen.queryByLabelText('Mở trò chuyện với PT')).toBeNull();
  mockAccount = { user: { id: 'bob' }, isAuthenticated: true };
  await act(() => useCoachStore.getState().reset()); jest.mocked(coachApi.messages).mockResolvedValue([]);
  await view.rerender(<FloatingCoachChat key='bob' />);
  await fireEvent.press(screen.getByLabelText('Mở trò chuyện với PT'));
  await waitFor(() => expect(screen.getByLabelText('Tin nhắn cho PT').props.value).toBe(''));
  expect(screen.queryByText('Previous conversation')).toBeNull();
});
