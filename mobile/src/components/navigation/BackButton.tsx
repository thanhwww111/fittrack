import { translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { Pressable } from "react-native";
import { colors, radius } from "@/constants/theme";
import { leaveScreen } from "@/lib/navigation";

export function BackButton({ close = false, compact = true, onPress }: { close?: boolean; compact?: boolean; onPress?: () => void }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.
  useTranslation();
  const path = usePathname();
  return <Pressable accessibilityRole="button" accessibilityLabel={close ? t("Đóng") : t("Quay lại")} hitSlop={compact ? 8 : undefined}
    onPress={onPress ?? (() => leaveScreen(router, path))} style={({ pressed }) => compact ? { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, opacity: pressed ? 0.7 : 1 } : { minWidth: 44, minHeight: 44, justifyContent: "center" }}>
    <Ionicons name={close ? "close" : "chevron-back"} size={compact ? 22 : 26} color={compact ? colors.primaryText : colors.primary} />
  </Pressable>;
}
