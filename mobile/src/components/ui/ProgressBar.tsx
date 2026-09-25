import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface ProgressBarProps {
  label: string;
  value: number;
  target: number | null;
  unit: string;
  color?: string;
}

// Thanh tiến độ "đã ăn / target", chuyển đỏ khi vượt target
export function ProgressBar({ label, value, target, unit, color = colors.primary }: ProgressBarProps) {
  const ratio = target ? value / target : 0;
  const over = ratio > 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(value)}
          {target ? ` / ${Math.round(target)}` : ""} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: over ? colors.danger : color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  header: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 14, color: colors.text, fontWeight: "500" },
  value: { fontSize: 14, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
