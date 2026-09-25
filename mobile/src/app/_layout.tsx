import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { colors, setActiveScheme, type ColorScheme } from "@/constants/theme";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { configureNotifications } from "@/lib/notifications";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useThemeStore } from "@/stores/themeStore";
import "@/stores/resetOnLogout";

// Giữ splash cho đến khi biết user đã đăng nhập hay chưa, tránh nháy màn Login
SplashScreen.preventAutoHideAsync();
configureNotifications();

// Header, tab bar của navigation dùng cùng bảng màu với app
function navigationTheme(scheme: ColorScheme): Theme {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };
}

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isAuthenticated = status === "authenticated";

  const preference = useThemeStore((s) => s.preference);
  const themeReady = useThemeStore((s) => s.hydrated);
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  // Đặt bảng màu trước khi render cây con để `colors` / `themedStyles` đọc đúng theme
  setActiveScheme(scheme);
  const navTheme = useMemo(() => navigationTheme(scheme), [scheme]);

  useEffect(() => {
    bootstrap();
    useThemeStore.getState().hydrate();
  }, [bootstrap]);

  useEffect(() => {
    // Nền gốc của app (thấy khi chuyển màn / bàn phím mở) theo theme
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [scheme]);

  const ready = status !== "loading" && themeReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Mỗi lần vào phiên: đồng bộ cài đặt thông báo, lịch nhắc và push token
  useEffect(() => {
    if (isAuthenticated) useNotificationStore.getState().syncOnLogin();
  }, [isAuthenticated]);

  useNotificationNavigation(isAuthenticated);

  if (!ready) return null;

  // guard = false thì Expo Router tự đưa user về route đầu tiên còn truy cập được,
  // nên đăng xuất xong sẽ về (auth)/login, đăng nhập xong sẽ vào (tabs).
  // key = scheme: đổi theme thì dựng lại toàn bộ màn hình với bảng màu mới.
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        key={scheme}
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
            name="settings/account"
            options={{ headerShown: true, title: "Tài khoản & bảo mật", headerBackTitle: "Quay lại" }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{ headerShown: true, title: "Thông báo", headerBackTitle: "Quay lại" }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
