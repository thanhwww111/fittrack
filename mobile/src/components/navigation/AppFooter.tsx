import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, themedStyles } from "@/constants/theme";
import { activeTab, APP_TABS, selectTab } from "@/lib/navigation";
import { useTranslation } from "@/i18n";

export function AppFooter() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const selected = activeTab(path);
  // The picker is modal: the underlying footer remains visible but cannot steal focus/taps.
  const blocked = path === "/workout/exercises";
  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 6) }]}
    pointerEvents={blocked ? "none" : "auto"} accessibilityElementsHidden={blocked}
    importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}>
    {APP_TABS.map((tab) => <Pressable key={tab.name} appearance="plain" accessibilityRole="tab"
      accessibilityLabel={tab.title} accessibilityState={{ selected: selected === tab.name, disabled: blocked }}
      disabled={blocked} onPress={() => selectTab(router, path, tab.name)} style={styles.item}>
      <Ionicons name={selected === tab.name ? tab.focusedIcon : tab.icon} size={23}
        color={selected === tab.name ? colors.primary : colors.textMuted} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.label, selected === tab.name && { color: colors.primary }]}>{tab.title}</Text>
    </Pressable>)}
  </View>;
}
const styles = themedStyles(() => ({
  footer: { flexDirection: "row", paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  item: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
}));
