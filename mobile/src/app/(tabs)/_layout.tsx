import { translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { colors, shadow } from "@/constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface TabIconProps {
  name: IconName;
  focusedName: IconName;
  focused: boolean;
  color: ColorValue;
  size: number;
}

function TabIcon({ name, focusedName, focused, color, size }: TabIconProps) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return <Ionicons name={focused ? focusedName : name} size={size} color={color as string} />;
}

const TABS: { name: string; title: string; icon: IconName; focusedIcon: IconName }[] = [
  { name: "index", get title() { return t("Trang chủ"); }, icon: "home-outline", focusedIcon: "home" },
  { name: "nutrition", get title() { return t("Dinh dưỡng"); }, icon: "nutrition-outline", focusedIcon: "nutrition" },
  { name: "workout", get title() { return t("Tập luyện"); }, icon: "barbell-outline", focusedIcon: "barbell" },
  { name: "plan", get title() { return t("Kế hoạch"); }, icon: "calendar-outline", focusedIcon: "calendar" },
  { name: "progress", get title() { return t("Tiến độ"); }, icon: "stats-chart-outline", focusedIcon: "stats-chart" },
  { name: "profile", get title() { return t("Cá nhân"); }, icon: "person-outline", focusedIcon: "person" },
];

export default function TabsLayout() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...shadow(2),
        },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerRight: () => <ThemeToggleButton />,
        headerTitleStyle: { fontSize: 20, fontWeight: "800", color: colors.text },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: (p) => <TabIcon name={tab.icon} focusedName={tab.focusedIcon} {...p} />,
          }}
        />
      ))}
    </Tabs>
  );
}
