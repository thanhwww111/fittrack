import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { colors, radius, shadow, spacing, themedStyles } from "@/constants/theme";

interface StatTileProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  hint?: string;
  tint: string; // màu icon
  tintSoft: string; // nền tròn sau icon
}

// Ô thống kê nhỏ trên trang chủ: icon màu + số lớn + nhãn
export function StatTile({ icon, label, value, hint, tint, tintSoft }: StatTileProps) {
  return (
    <View style={[styles.tile, shadow(1)]} accessible accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ""}`}>
      <View style={[styles.iconWrap, { backgroundColor: tintSoft }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  tile: {
    width: 118,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: { fontSize: 20, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  label: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  hint: { fontSize: 12, color: colors.textMuted },
}));
