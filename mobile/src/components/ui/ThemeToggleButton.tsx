import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname, type Href } from "expo-router";
import { useEffect } from "react";
import { Pressable } from "react-native";
import { colors, getActiveScheme, radius, spacing } from "@/constants/theme";
import { useThemeStore } from "@/stores/themeStore";

// Nút ☀️/🌙 trên header các tab: bấm để đổi giao diện Sáng ↔ Tối ở bất kỳ tab nào
export function ThemeToggleButton() {
  const pathname = usePathname();
  const dark = getActiveScheme() === "dark";

  // Đổi theme dựng lại toàn bộ màn hình và về tab đầu: đưa user về lại tab đang xem
  useEffect(() => {
    const path = useThemeStore.getState().takeReturnPath();
    if (path && path !== pathname) router.replace(path as Href);
    // Chỉ chạy lúc nút vừa mount sau khi đổi theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      hitSlop={8}
      onPress={() => useThemeStore.getState().toggle(dark ? "dark" : "light", pathname)}
      style={({ pressed }) => ({
        marginRight: spacing.lg,
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primarySoft,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={dark ? "sunny" : "moon"} size={20} color={colors.primaryText} />
    </Pressable>
  );
}
