import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

function openFrom(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    router.push(url as Href);
  }
}

// Bấm vào thông báo thì mở đúng màn (data.url do server hoặc lịch nhắc gắn vào).
// Chỉ bật khi đã đăng nhập, vì các route đích đều cần đăng nhập.
export function useNotificationNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    // App được mở từ trạng thái tắt hẳn bằng cách bấm vào thông báo
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openFrom(response);
        Notifications.clearLastNotificationResponseAsync();
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(openFrom);
    return () => subscription.remove();
  }, [enabled]);
}
