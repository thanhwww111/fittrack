import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { env } from "../../config/env";

let client: Expo | null = null;

function getClient() {
  // Access token chỉ cần khi bật "Enhanced push security" trên EAS
  client ??= new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });
  return client;
}

export interface PushPayload {
  title: string;
  body: string;
  // `url` là route trong app để mở khi user bấm vào thông báo
  data?: { url?: string; [key: string]: unknown };
}

export interface SendResult {
  sent: number;
  // Token Expo báo đã gỡ app / hết hạn: service sẽ xoá khỏi DB
  invalidTokens: string[];
}

// Gửi cùng một nội dung tới nhiều token qua Expo Push Service (Android đi qua FCM)
async function send(tokens: string[], payload: PushPayload): Promise<SendResult> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  const invalidTokens: string[] = tokens.filter((t) => !Expo.isExpoPushToken(t));
  if (valid.length === 0) return { sent: 0, invalidTokens };

  const expo = getClient();
  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: "default",
    channelId: "default",
  }));

  let sent = 0;
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        sent += 1;
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(chunk[i].to as string);
      } else {
        console.warn("Push ticket error:", ticket.message);
      }
    });
  }

  return { sent, invalidTokens };
}

// Gom vào object để test có thể thay bằng vi.spyOn(pushClient, "send")
export const pushClient = { send };
