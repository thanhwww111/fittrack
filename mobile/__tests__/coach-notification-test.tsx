import { render, waitFor, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { coachApi } from '@/api/coachApi';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/coachApi', () => ({ coachApi: { opened: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('expo-notifications', () => ({ getLastNotificationResponseAsync: jest.fn(), clearLastNotificationResponseAsync: jest.fn(), addNotificationResponseReceivedListener: jest.fn() }));
const response = { actionIdentifier: 'default', notification: { request: { identifier: 'n1', content: { data: { url: '/plan/coach', coachJobId: 'job1' } } } } } as unknown as Notifications.NotificationResponse;
function Harness() { useNotificationNavigation(true); return null; }
const originalOS = Platform.OS;
beforeEach(() => { jest.clearAllMocks(); Platform.OS = 'ios'; jest.mocked(Notifications.addNotificationResponseReceivedListener).mockReturnValue({ remove: jest.fn() }); });
afterEach(() => { Platform.OS = originalOS; });
it('opens the coach and acknowledges a tap only once across cold and listener delivery', async () => {
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(response);
  await render(<Harness />);
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/plan/coach'));
  const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
  await act(async () => listener(response));
  expect(coachApi.opened).toHaveBeenCalledTimes(1);
  expect(coachApi.opened).toHaveBeenCalledWith('job1');
});
it('does not acknowledge a receipt without a user response', async () => {
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(null);
  await render(<Harness />);
  expect(coachApi.opened).not.toHaveBeenCalled();
});
