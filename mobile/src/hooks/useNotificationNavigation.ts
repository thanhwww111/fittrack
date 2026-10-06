import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { coachApi } from '@/api/coachApi';

function openFrom(response: Notifications.NotificationResponse | null, seen: Set<string>) {
  if (!response) return;
  const notificationId = response.notification.request.identifier;
  if (seen.has(notificationId)) return;
  seen.add(notificationId);
  const url = response?.notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    router.push(url as Href);
  }
  const jobId = response.notification.request.content.data?.coachJobId;
  if (typeof jobId === 'string' && jobId) void coachApi.opened(jobId).catch(() => {});
}

// Bấm vào thông báo thì mở đúng màn (data.url do server hoặc lịch nhắc gắn vào).
// Chỉ bật khi đã đăng nhập, vì các route đích đều cần đăng nhập.
export function useNotificationNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    let active = true;
    const seen = new Set<string>();
    const onResponse = (response: Notifications.NotificationResponse) => { if (active) openFrom(response, seen); };

    // App được mở từ trạng thái tắt hẳn bằng cách bấm vào thông báo
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && active) {
        onResponse(response);
        Notifications.clearLastNotificationResponseAsync();
      }
    }).catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => { active = false; subscription.remove(); };
  }, [enabled]);
}
