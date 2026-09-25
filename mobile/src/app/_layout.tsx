import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import "@/stores/resetOnLogout";

// Giữ splash cho đến khi biết user đã đăng nhập hay chưa, tránh nháy màn Login
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync();
  }, [status]);

  if (status === "loading") return null;

  const isAuthenticated = status === "authenticated";

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
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
