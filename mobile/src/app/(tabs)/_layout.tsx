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
  return <Ionicons name={focused ? focusedName : name} size={size} color={color as string} />;
}

const TABS: { name: string; title: string; icon: IconName; focusedIcon: IconName }[] = [
  { name: "index", title: "Trang chủ", icon: "home-outline", focusedIcon: "home" },
  { name: "nutrition", title: "Dinh dưỡng", icon: "nutrition-outline", focusedIcon: "nutrition" },
  { name: "workout", title: "Tập luyện", icon: "barbell-outline", focusedIcon: "barbell" },
  { name: "progress", title: "Tiến độ", icon: "stats-chart-outline", focusedIcon: "stats-chart" },
  { name: "profile", title: "Cá nhân", icon: "person-outline", focusedIcon: "person" },
];

export default function TabsLayout() {
  return (
    <Tabs
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
