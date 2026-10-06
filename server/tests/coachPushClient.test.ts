import { describe, it, expect, vi, afterEach } from 'vitest';
import { Expo } from 'expo-server-sdk';
import { coachPushClient } from '../src/services/push/coachPushClient';
afterEach(() => vi.restoreAllMocks());
describe('coach provider handoff', () => {
  it('preserves tickets per token and classifies invalid/transient failures', async () => {
    vi.spyOn(Expo.prototype, 'sendPushNotificationsAsync').mockResolvedValue([{ status: 'ok', id: 'expo-1' }, { status: 'error', message: 'Gone', details: { error: 'DeviceNotRegistered' } }, { status: 'error', message: 'Slow', details: { error: 'MessageRateExceeded' } }]);
    expect(await coachPushClient.send(['ExponentPushToken[a]', 'ExponentPushToken[b]', 'ExponentPushToken[c]', 'bad'], { title: 'PT', body: 'Reminder', data: {} })).toEqual([
      { token: 'bad', status: 'invalid' }, { token: 'ExponentPushToken[a]', status: 'accepted', ticketId: 'expo-1' }, { token: 'ExponentPushToken[b]', status: 'invalid', error: 'DeviceNotRegistered' }, { token: 'ExponentPushToken[c]', status: 'transient', error: 'MessageRateExceeded' },
    ]);
  });
  it('retrieves exact receipt IDs rather than claiming device delivery', async () => {
    vi.spyOn(Expo.prototype, 'getPushNotificationReceiptsAsync').mockResolvedValue({ 'expo-1': { status: 'ok' } });
    expect(await coachPushClient.receipts(['expo-1'])).toEqual({ 'expo-1': { status: 'ok' } });
  });
  it('preserves accepted tickets when a later chunk fails', async () => {
    vi.spyOn(Expo.prototype, 'chunkPushNotifications').mockImplementation(messages => messages.map(m => [m]));
    vi.spyOn(Expo.prototype, 'sendPushNotificationsAsync').mockResolvedValueOnce([{ status: 'ok', id: 'first-ticket' }]).mockRejectedValueOnce(new Error('Network timeout'));
    expect(await coachPushClient.send(['ExponentPushToken[a]', 'ExponentPushToken[b]'], { title: 'PT', body: 'Reminder', data: {} })).toEqual([{ token: 'ExponentPushToken[a]', status: 'accepted', ticketId: 'first-ticket' }, { token: 'ExponentPushToken[b]', status: 'transient', error: 'Provider unavailable' }]);
  });
});
