import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing, themedStyles } from "@/constants/theme";

interface CardProps {
  title?: string;
  // Icon nhỏ trước tiêu đề, màu primary
  icon?: ComponentProps<typeof Ionicons>["name"];
  // Nội dung bên phải tiêu đề (link "Xem tất cả", nút...)
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ title, icon, action, children, style }: CardProps) {
  return (
    <View style={[styles.card, shadow(1), style]}>
      {title ? (
        <View style={styles.header}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={16} color={colors.primary} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
}));
