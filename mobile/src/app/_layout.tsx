import { translate as t , useTranslation } from "@/i18n";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, usePathname, type Theme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, AppState, useColorScheme, View } from "react-native";
import { colors, setActiveScheme, type ColorScheme } from "@/constants/theme";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { configureNotifications, schedulePersonalPlanReminders } from "@/lib/notifications";
import { isProfileComplete } from "@/lib/profileForm";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useProfileStore } from "@/stores/profileStore";
import { useThemeStore } from "@/stores/themeStore";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BackButton } from "@/components/navigation/BackButton";
import "@/stores/resetOnLogout";
import { useLanguageStore } from "@/stores/languageStore";
import { needsGymSchedule } from "@/lib/personalPlan";
import { usePersonalPlanStore } from "@/stores/personalPlanStore";
import { useCoachStore } from "@/stores/coachStore";
import { WeeklyCheckInGate } from "@/components/profile/WeeklyCheckInGate";

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
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  const { locale } = useTranslation();
  const languageReady = useLanguageStore(s => s.hydrated);
  const pathname = usePathname();
  const authUserId = useAuthStore(s => s.user?.id);
  const planData = usePersonalPlanStore(s => s.data);
  const planSurvey = usePersonalPlanStore(s => s.survey);
  const coachSettings = useCoachStore(s => s.settings);
  const schedule = useTrainingScheduleStore((s) => s.data);
  const scheduleError = useTrainingScheduleStore((s) => s.error);
  const status = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const isAuthenticated = status === "authenticated";

  // Hồ sơ tải ngay khi vào phiên để biết có phải thiết lập lần đầu không
  const profile = useProfileStore((s) => s.profile);
  const profileError = useProfileStore((s) => s.error);
  const onboardingActive = useProfileStore((s) => s.onboardingActive);
  // Lỗi mạng khi tải hồ sơ thì vẫn cho vào app (tab Cá nhân sẽ báo lỗi), không khoá user
  const profileSettled = !isAuthenticated || profile !== null || profileError !== null;
  const needsOnboarding =
    isAuthenticated && profile !== null && (onboardingActive || !isProfileComplete(profile) || (schedule !== null && needsGymSchedule(profile.trainingMode, !!schedule.current)));
  const profileComplete = profile !== null && isProfileComplete(profile);

  useEffect(() => {
    if (isAuthenticated && profileComplete) { void useTrainingScheduleStore.getState().load(); void usePersonalPlanStore.getState().load(); }
  }, [isAuthenticated, profileComplete, authUserId]);
  useEffect(() => {
    if (isAuthenticated && profileComplete && schedule && needsGymSchedule(profile?.trainingMode, !!schedule.current)
      && pathname !== "/onboarding" && !pathname.startsWith("/workout/")) router.replace("/onboarding");
  }, [isAuthenticated, profileComplete, schedule, pathname, profile?.trainingMode]);

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
    void useLanguageStore.getState().hydrate();
  }, [bootstrap]);

  useEffect(() => {
    // Nền gốc của app (thấy khi chuyển màn / bàn phím mở) theo theme
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [scheme]);

  const ready = status !== "loading" && themeReady && languageReady;

  useEffect(() => {
    if (isAuthenticated) useProfileStore.getState().fetchProfile();
  }, [isAuthenticated, authUserId]);

  useEffect(() => { if (isAuthenticated) void useCoachStore.getState().load(); }, [isAuthenticated, authUserId]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Mỗi lần vào phiên: đồng bộ cài đặt thông báo, lịch nhắc và push token
  useEffect(() => {
    if (isAuthenticated) useNotificationStore.getState().syncOnLogin();
  }, [isAuthenticated, locale]);

  // Quay lại app (có thể đã sang ngày mới): cập nhật nhắc "còn thiếu bao nhiêu calo/protein"
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void useNotificationStore.getState().refreshNutritionReminders();
        void useNotificationStore.getState().refreshWorkoutReminders();
        void useTrainingScheduleStore.getState().load();
        void usePersonalPlanStore.getState().load();
        void useCoachStore.getState().load();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => { void schedulePersonalPlanReminders(isAuthenticated ? planData : null, isAuthenticated && coachSettings !== null && !coachSettings.enabled && !!planSurvey?.remindersEnabled); }, [isAuthenticated, authUserId, planData, planSurvey?.remindersEnabled, coachSettings, locale]);

  useNotificationNavigation(isAuthenticated);

  if (!ready) return null;

  // Vừa đăng nhập, đang tải hồ sơ: chưa biết vào màn thiết lập hay vào app
  if (!profileSettled) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // guard = false thì Expo Router tự đưa user về route đầu tiên còn truy cập được,
  // nên đăng xuất xong sẽ về (auth)/login, đăng nhập xong sẽ vào (tabs).
  // key = scheme: đổi theme thì dựng lại toàn bộ màn hình với bảng màu mới.
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1 }}>
      <Stack
        key={scheme}
        screenOptions={{
          headerShown: false,
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* User mới / hồ sơ thiếu chỉ số: bắt buộc thiết lập trước khi vào app */}
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated && (!needsOnboarding || profileComplete)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="food" />
          <Stack.Screen name="plan" />
          <Stack.Screen name="workout" />
          <Stack.Screen name="ai" />
          <Stack.Screen name="measurements" />
          <Stack.Screen name="history" options={{ headerShown: true, title: t("Lịch sử theo ngày"), headerBackTitle: t("Quay lại") }} />
          <Stack.Screen
            name="settings/account"
            options={{ headerShown: true, title: t("Tài khoản & bảo mật"), headerBackTitle: t("Quay lại") }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{ headerShown: true, title: t("Thông báo"), headerBackTitle: t("Quay lại") }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {isAuthenticated && !needsOnboarding && (profile?.trainingMode === "OTHER" || schedule?.current || scheduleError) ? <AppFooter /> : null}
      {isAuthenticated && profileComplete && !needsOnboarding && profile ? <WeeklyCheckInGate key={profile.userId} profile={profile} /> : null}
      </View>
    </ThemeProvider>
  );
}
