import { Expo, type ExpoPushMessage, type ExpoPushReceipt } from 'expo-server-sdk';
import { env } from '../../config/env';
let client: Expo | undefined;
const expo = () => client ??= new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });
export type CoachTicket = { token: string; status: 'accepted' | 'invalid' | 'transient' | 'failed'; ticketId?: string; error?: string };
async function send(tokens: string[], payload: { title: string; body: string; data: Record<string, unknown> }): Promise<CoachTicket[]> {
  const results: CoachTicket[] = tokens.filter(token => !Expo.isExpoPushToken(token)).map(token => ({ token, status: 'invalid' }));
  const messages: ExpoPushMessage[] = tokens.filter(Expo.isExpoPushToken).map(to => ({ to, ...payload, sound: 'default', channelId: 'default' }));
  for (const chunk of expo().chunkPushNotifications(messages)) {
    try {
      const tickets = await expo().sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => results.push(ticket.status === 'ok' ? { token: chunk[i].to as string, status: 'accepted', ticketId: ticket.id } : { token: chunk[i].to as string, status: ticket.details?.error === 'DeviceNotRegistered' ? 'invalid' : ticket.details?.error === 'MessageRateExceeded' ? 'transient' : 'failed', error: ticket.details?.error ?? ticket.message }));
    } catch {
      results.push(...chunk.map(m => ({ token: m.to as string, status: 'transient' as const, error: 'Provider unavailable' })));
    }
  }
  return results;
}
async function receipts(ids: string[]): Promise<Record<string, ExpoPushReceipt>> {
  const result: Record<string, ExpoPushReceipt> = {};
  for (const chunk of expo().chunkPushNotificationReceiptIds(ids)) Object.assign(result, await expo().getPushNotificationReceiptsAsync(chunk));
  return result;
}
export const coachPushClient = { send, receipts };
