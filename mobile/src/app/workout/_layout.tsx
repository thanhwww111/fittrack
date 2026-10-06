import { translate as t, useTranslation } from "@/i18n";
import { BackButton } from "@/components/navigation/BackButton";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function WorkoutLayout() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false, headerLeft: () => <BackButton />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="start" options={{ title: t("Đang tập"), gestureEnabled: false }} />
      <Stack.Screen name="templates" options={{ title: t("Template của bạn") }} />
      <Stack.Screen name="template" options={{ title: "Template" }} />
      <Stack.Screen name="programs" options={{ title: t("Lịch tập theo tuần") }} />
      <Stack.Screen name="program" options={{ title: t("Lịch tuần") }} />
      <Stack.Screen name="exercises" options={{ title: t("Chọn bài tập"), presentation: "modal", headerLeft: () => <BackButton close /> }} />
      <Stack.Screen name="history" options={{ title: t("Lịch sử tập") }} />
      <Stack.Screen name="session" options={{ title: t("Chi tiết buổi tập") }} />
      <Stack.Screen name="exercise" options={{ title: t("Bài tập") }} />
    </Stack>
  );
}
