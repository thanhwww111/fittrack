import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";
import type { Macros } from "@/types/models";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Dòng tóm tắt "165 kcal · P 31 · C 0 · F 3.6"
export function MacroChips({ values, size = "sm" }: { values: Macros; size?: "sm" | "lg" }) {
  const large = size === "lg";
  return (
    <View style={styles.row}>
      <Chip label="kcal" value={fmt(values.calories)} color={colors.primary} large={large} />
      <Chip label="P" value={`${fmt(values.protein)}g`} color={colors.protein} large={large} />
      <Chip label="C" value={`${fmt(values.carbs)}g`} color={colors.carbs} large={large} />
      <Chip label="F" value={`${fmt(values.fat)}g`} color={colors.fat} large={large} />
    </View>
  );
}

function Chip({
  label,
  value,
  color,
  large,
}: {
  label: string;
  value: string;
  color: string;
  large: boolean;
}) {
  return (
    <View style={[styles.chip, large && styles.chipLarge]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, large && styles.textLarge]}>
        {label === "kcal" ? `${value} ${label}` : `${label} ${value}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  chipLarge: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  textLarge: { fontSize: 15, color: colors.text, fontWeight: "600" },
});
