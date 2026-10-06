import { translate as t, useTranslation } from "@/i18n";
import { BackButton } from "@/components/navigation/BackButton";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function AiLayout() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false, headerLeft: () => <BackButton />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="meal" options={{ title: t("Gợi ý món bằng AI") }} />
      <Stack.Screen name="workout" options={{ title: t("Phân tích tập luyện") }} />
    </Stack>
  );
}
