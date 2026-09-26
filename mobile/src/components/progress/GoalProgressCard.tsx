import { router } from "expo-router";
import { Text, View } from "react-native";
import { shortDate } from "@/components/charts/scale";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RingProgress } from "@/components/ui/RingProgress";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { formatRate, goalStatusText } from "@/lib/goal";
import type { GoalProgress } from "@/types/models";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Số tuần gần nhất có dữ liệu hiển thị trong phần xu hướng
const TREND_ROWS = 4;

// Tiến độ từ cân lúc bắt đầu đến cân mục tiêu + xu hướng cân theo tuần
export function GoalProgressCard({ goal }: { goal: GoalProgress }) {
  if (!goal.goalType) {
    return (
      <Card title="Mục tiêu cân nặng" icon="flag">
        <Text style={styles.muted}>
          Đặt mục tiêu và cân nặng mục tiêu trong hồ sơ để theo dõi tiến độ theo tuần.
        </Text>
        <Button title="Đặt mục tiêu" variant="secondary" onPress={() => router.push("/profile")} />
      </Card>
    );
  }

  const trend = goal.weeks.filter((w) => w.average !== null).slice(-TREND_ROWS).reverse();
  const statusColor =
    goal.status === "ON_TRACK"
      ? colors.success
      : goal.status === "WRONG_DIRECTION"
        ? colors.danger
        : colors.textMuted;

  return (
    <Card title="Mục tiêu cân nặng" icon="flag">
      {goal.goalType === "MAINTENANCE" ? (
        <Text style={styles.body}>
          Giữ cân{goal.currentWeight !== null ? ` quanh ${fmt(goal.currentWeight)} kg` : ""}
        </Text>
      ) : goal.goalWeight !== null && goal.startWeight !== null && goal.currentWeight !== null ? (
        <View style={styles.progress}>
          <RingProgress
            progress={(goal.percent ?? 0) / 100}
            size={104}
            strokeWidth={11}
            color={goal.reached ? colors.success : colors.primary}
            trackColor={colors.surfaceMuted}
            accessibilityLabel={`Đã đi được ${goal.percent ?? 0}% quãng đường tới mục tiêu`}
          >
            <Text style={styles.percent}>{goal.percent ?? 0}%</Text>
          </RingProgress>
          <View style={styles.progressText}>
            <Text style={styles.current}>{fmt(goal.currentWeight)} kg</Text>
            <Text style={styles.body}>
              {goal.reached ? "🎉 Đã đạt mục tiêu" : `còn ${fmt(goal.remaining ?? 0)} kg`}
            </Text>
            <Text style={styles.muted}>
              {fmt(goal.startWeight)} kg → {fmt(goal.goalWeight)} kg
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.muted}>Nhập cân nặng mục tiêu trong hồ sơ để xem % tiến độ.</Text>
      )}

      {goal.targetRate !== null ? (
        <View style={styles.rates}>
          <Text style={styles.muted}>
            Mục tiêu {formatRate(goal.targetRate)}
            {goal.actualRate !== null ? ` · Thực tế ${formatRate(goal.actualRate)}` : ""}
          </Text>
          {goal.status ? (
            <Text style={[styles.status, { color: statusColor }]}>{goalStatusText(goal.status)}</Text>
          ) : null}
          {goal.estimatedWeeks !== null ? (
            <Text style={styles.muted}>Ước tính còn khoảng {goal.estimatedWeeks} tuần</Text>
          ) : null}
        </View>
      ) : null}

      {trend.length > 0 ? (
        <View style={styles.trend}>
          <Text style={styles.trendTitle}>Trung bình theo tuần</Text>
          {trend.map((w) => (
            <View key={w.weekStart} style={styles.trendRow}>
              <Text style={styles.muted}>Tuần {shortDate(w.weekStart)}</Text>
              <Text style={styles.trendValue}>
                {fmt(w.average!)} kg
                {w.change !== null ? ` (${w.change > 0 ? "+" : ""}${fmt(w.change)})` : ""}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  muted: { fontSize: 14, color: colors.textMuted },
  body: { fontSize: 15, color: colors.text, fontWeight: "500" },
  progress: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  progressText: { flex: 1, gap: 2 },
  percent: { fontSize: 22, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  current: { fontSize: 24, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  rates: { gap: 2 },
  status: { fontSize: 14, fontWeight: "600" },
  trend: { gap: spacing.xs },
  trendTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  trendRow: { flexDirection: "row", justifyContent: "space-between" },
  trendValue: { fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] },
}));
