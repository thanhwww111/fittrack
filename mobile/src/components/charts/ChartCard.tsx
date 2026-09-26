import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, spacing, themedStyles } from "@/constants/theme";

export interface TableRow {
  key: string;
  label: string;
  value: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  headline?: ReactNode;
  chart: ReactNode;
  rows: TableRow[];
  emptyText: string;
}

// Khung biểu đồ + nút chuyển sang dạng bảng (cho trình đọc màn hình và để xem số chính xác)
export function ChartCard({ title, subtitle, headline, chart, rows, emptyText }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const empty = rows.length === 0;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {!empty ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setShowTable((v) => !v)}
          >
            <Text style={styles.toggle}>{showTable ? "Biểu đồ" : "Bảng"}</Text>
          </Pressable>
        ) : null}
      </View>

      {headline}

      {empty ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : showTable ? (
        <View>
          {rows.map((r) => (
            <View key={r.key} style={styles.row}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        chart
      )}
    </Card>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  toggle: { fontSize: 14, fontWeight: "600", color: colors.primary },
  empty: { fontSize: 14, color: colors.textMuted, paddingVertical: spacing.lg, textAlign: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] },
}));
