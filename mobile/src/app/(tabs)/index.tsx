import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MacroBars } from "@/components/nutrition/MacroBars";
import { WaterCard } from "@/components/nutrition/WaterCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TodayWorkoutCard } from "@/components/workout/TodayWorkoutCard";
import { colors, radius, spacing } from "@/constants/theme";
import { useDashboard } from "@/hooks/useDashboard";
import { localToday } from "@/hooks/useProgress";
import { mealTypeForHour } from "@/lib/nutrition";
import { formatDuration } from "@/lib/workout";
import { useAuthStore } from "@/stores/authStore";

function greeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}


export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data, error, isLoading, isRefreshing, refresh } = useDashboard();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const nutrition = data?.nutrition;
  const weekly = data?.weekly;
  const weightChange = weekly?.weight.change;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
    >
      <View>
        <Text style={styles.greeting}>
          {greeting(new Date().getHours())}, {user?.name} 👋
        </Text>
        {weekly?.weight.current != null ? (
          <Text style={styles.weight}>
            {formatNumber(weekly.weight.current)} kg
            {weightChange != null ? (
              <Text style={styles.weightChange}>
                {"  "}
                {weightChange > 0 ? "+" : ""}
                {formatNumber(weightChange)} kg tuần này
              </Text>
            ) : null}
          </Text>
        ) : null}
      </View>

      <View style={styles.quickRow}>
        <QuickAction
          icon="restaurant-outline"
          label="Ghi món"
          onPress={() =>
            router.push({
              pathname: "/food/search",
              params: { mealType: mealTypeForHour(new Date().getHours()) },
            })
          }
        />
        <QuickAction
          icon="scale-outline"
          label="Cân nặng"
          onPress={() => router.push({ pathname: "/measurements/edit", params: { date: localToday() } })}
        />
        <QuickAction icon="barbell-outline" label="Tập luyện" onPress={() => router.push("/workout")} />
      </View>

      <ErrorBanner message={error} />

      {nutrition ? (
        <Card title="Dinh dưỡng hôm nay">
          {nutrition.target ? (
            <MacroBars consumed={nutrition.consumed} target={nutrition.target} />
          ) : (
            <>
              <Text style={styles.muted}>
                Bạn chưa có mục tiêu dinh dưỡng. Hoàn thiện hồ sơ để FitTrack tính calo và macro
                phù hợp.
              </Text>
              <Link href="/profile" asChild>
                <Button title="Thiết lập hồ sơ" onPress={() => {}} variant="secondary" />
              </Link>
            </>
          )}
        </Card>
      ) : null}

      {nutrition ? <WaterCard date={nutrition.date} /> : null}

      {data ? (
        <TodayWorkoutCard
          active={data.workoutToday.active}
          completed={data.workoutToday.completed}
        />
      ) : null}

      {weekly ? (
        <Card title="Tuần này">
          <View style={styles.statsRow}>
            <Stat label="Buổi tập" value={String(weekly.workout.sessions)} />
            <Stat label="Volume" value={`${formatNumber(weekly.workout.totalVolume)} kg`} />
            <Stat label="Thời gian" value={formatDuration(weekly.workout.duration)} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="PR mới" value={String(weekly.newPersonalRecords)} />
            <Stat label="Ngày đủ protein" value={String(weekly.nutrition.daysProteinGoalMet)} />
            <Stat label="Ngày đã log" value={String(weekly.nutrition.loggedDays)} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.lg },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  weight: { fontSize: 28, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  weightChange: { fontSize: 15, fontWeight: "500", color: colors.textMuted },
  muted: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 13, color: colors.textMuted },
  quickRow: { flexDirection: "row", gap: spacing.md },
  quick: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  quickText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  pressed: { opacity: 0.6 },
});
