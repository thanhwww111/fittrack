import { translate as t, useTranslation } from "@/i18n";
import { BackButton } from "@/components/navigation/BackButton";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function MeasurementsLayout() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false, headerLeft: () => <BackButton />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("Số đo cơ thể") }} />
      <Stack.Screen name="edit" options={{ title: t("Ghi số đo") }} />
    </Stack>
  );
}
