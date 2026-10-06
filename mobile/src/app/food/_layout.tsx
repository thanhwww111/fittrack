import { translate as t, useTranslation } from "@/i18n";
import { BackButton } from "@/components/navigation/BackButton";
import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function FoodLayout() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Stack
      screenOptions={{
        headerBackVisible: false, headerLeft: () => <BackButton />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="search" options={{ title: t("Ghi món") }} />
      <Stack.Screen name="add" options={{ title: t("Thêm món") }} />
      <Stack.Screen name="detail" options={{ title: t("Chi tiết món đã ăn") }} />
      <Stack.Screen name="create" options={{ title: t("Tạo món mới") }} />
      <Stack.Screen name="templates" options={{ title: t("Bữa mẫu") }} />
    </Stack>
  );
}
