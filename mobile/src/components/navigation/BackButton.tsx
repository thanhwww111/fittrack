import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { Pressable } from "react-native";
import { colors } from "@/constants/theme";
import { leaveScreen } from "@/lib/navigation";

export function BackButton({ close = false }: { close?: boolean }) {
  const path = usePathname();
  return <Pressable accessibilityRole="button" accessibilityLabel={close ? "Đóng" : "Quay lại"}
    onPress={() => leaveScreen(router, path)} style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
    <Ionicons name={close ? "close" : "chevron-back"} size={26} color={colors.primary} />
  </Pressable>;
}
