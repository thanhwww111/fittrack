import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { colors } from "@/constants/theme";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { configureNotifications } from "@/lib/notifications";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import "@/stores/resetOnLogout";

// Giữ splash cho đến khi biết user đã đăng nhập hay chưa, tránh nháy màn Login
SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync();
  }, [status]);

  // Mỗi lần vào phiên: đồng bộ cài đặt thông báo, lịch nhắc và push token
  useEffect(() => {
    if (isAuthenticated) useNotificationStore.getState().syncOnLogin();
  }, [isAuthenticated]);

  useNotificationNavigation(isAuthenticated);

  if (status === "loading") return null;

  // guard = false thì Expo Router tự đưa user về route đầu tiên còn truy cập được,
  // nên đăng xuất xong sẽ về (auth)/login, đăng nhập xong sẽ vào (tabs)
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="profile/index"
          options={{ headerShown: true, title: "Hồ sơ", headerBackTitle: "Quay lại" }}
        />
        <Stack.Screen name="food" />
        <Stack.Screen name="workout" />
        <Stack.Screen name="ai" />
        <Stack.Screen name="measurements" />
        <Stack.Screen
          name="settings/notifications"
          options={{ headerShown: true, title: "Thông báo", headerBackTitle: "Quay lại" }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
