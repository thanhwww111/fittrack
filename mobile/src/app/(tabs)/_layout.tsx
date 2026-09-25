import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { Pressable, type ColorValue } from "react-native";
import { colors, spacing } from "@/constants/theme";

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
];
function ProfileButton() {
  return (
    <Link href="/profile" asChild>
      <Pressable accessibilityLabel="Hồ sơ" hitSlop={8} style={{ marginRight: spacing.lg }}>
        <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerRight: () => <ProfileButton />,
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
