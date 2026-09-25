import type { ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";

interface CardProps {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ title, children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
}));
