import { localeTag , translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import { BarChart } from "@/components/charts/BarChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { shortDate } from "@/components/charts/scale";
import { GoalProgressCard } from "@/components/progress/GoalProgressCard";
import { WeightEntry } from "@/components/progress/WeightEntry";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { RANGES, useProgress, type RangeKey } from "@/hooks/useProgress";
import { formatVolume } from "@/lib/workout";

const fmt = (n: number) => n.toLocaleString(localeTag(), { maximumFractionDigits: 1 });

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export default function ProgressScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [rangeKey, setRangeKey] = useState<RangeKey>("1m");
  const { data, error, isRefreshing, refresh, reload } = useProgress(rangeKey);

  const weight = data?.weight;
  const span = weight ? Math.max(1, daysBetween(weight.from, weight.to)) : 1;
  const weightPoints =
    weight?.points.map((p) => ({
      x: daysBetween(weight.from, p.date) / span,
      label: shortDate(p.date),
      value: p.weight,
    })) ?? [];
  const change = weight?.summary.change ?? null;

  const weeks = data?.workoutWeeks ?? [];
  const hasWorkout = weeks.some((w) => w.sessions > 0);

  const nutrition = data?.nutrition;
  const latestTarget = nutrition?.days.findLast((d) => d.target)?.target ?? null;
  const hasNutrition = nutrition?.days.some((d) => d.logged) ?? false;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.segment} accessibilityRole="tablist">
        {RANGES.map((r) => {
          const selected = r.key === rangeKey;
          return (
            <Pressable
              key={r.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setRangeKey(r.key)}
              style={[styles.segmentItem, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorBanner message={error} />

      {data ? (
        <>
          <GoalProgressCard goal={data.goal} />

          <ChartCard
            title={t("Cân nặng")}
            subtitle={`${shortDate(weight!.from)} – ${shortDate(weight!.to)}`}
            headline={
              weight!.summary.current !== null ? (
                <View style={styles.headline}>
                  <Text style={styles.hero}>{fmt(weight!.summary.current)} kg</Text>
                  {change !== null && weightPoints.length > 1 ? (
                    <Text style={styles.delta}>{t("{value1} {value2} kg trong kỳ", { value1: change > 0 ? "+" : "", value2: fmt(change) })}</Text>
                  ) : null}
                </View>
              ) : null
            }
            chart={
              <LineChart
                points={weightPoints}
                formatValue={(v) => `${fmt(v)} kg`}
                accessibilityLabel={t("Biểu đồ cân nặng, {value1} lần đo", { value1: weightPoints.length })}
              />
            }
            rows={[...weight!.points].reverse().map((p) => ({
              key: p.date,
              label: shortDate(p.date),
              value: `${fmt(p.weight)} kg`,
            }))}
            emptyText={t("Chưa có lần đo nào trong khoảng này. Nhập cân nặng bên dưới để bắt đầu.")}
          />

          <Card>
            <WeightEntry
              key={weight!.summary.current ?? "none"}
              initialWeight={weight!.summary.current}
              onSaved={reload}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/measurements")}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <Ionicons name="body-outline" size={20} color={colors.primary} />
              <Text style={styles.linkText}>{t("Số đo cơ thể & lịch sử cân nặng")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          </Card>

          <ChartCard
            title={t("Volume tập theo tuần")}
            subtitle={t("Tổng kg × rep của các buổi đã hoàn thành")}
            chart={
              <BarChart
                bars={weeks.map((w) => ({
                  key: w.weekStart,
                  label: shortDate(w.weekStart),
                  detail: t("Tuần {value1} · {value2} buổi", { value1: shortDate(w.weekStart), value2: w.sessions }),
                  value: w.totalVolume,
                }))}
                formatValue={formatVolume}
                accessibilityLabel={t("Biểu đồ volume {value1} tuần gần nhất", { value1: weeks.length })}
              />
            }
            rows={
              hasWorkout
                ? [...weeks].reverse().map((w) => ({
                    key: w.weekStart,
                    label: t("Tuần {value1} ({value2} buổi)", { value1: shortDate(w.weekStart), value2: w.sessions }),
                    value: formatVolume(w.totalVolume),
                  }))
                : []
            }
            emptyText={t("Chưa có buổi tập nào hoàn thành trong khoảng này.")}
          />

          <ChartCard
            title={t("Calo 7 ngày qua")}
            subtitle={
              latestTarget
                ? t("Đường kẻ ngang: mục tiêu {value1} kcal/ngày", { value1: fmt(latestTarget.calories) })
                : undefined
            }
            headline={
              hasNutrition ? (
                <View style={styles.stats}>
                  <Stat label={t("TB kcal/ngày")} value={fmt(nutrition!.summary.averages.calories)} />
                  <Stat label="TB protein" value={`${fmt(nutrition!.summary.averages.protein)} g`} />
                  <Stat
                    label={t("Ngày đủ protein")}
                    value={`${nutrition!.summary.daysProteinGoalMet}/${nutrition!.summary.loggedDays}`}
                  />
                </View>
              ) : null
            }
            chart={
              <BarChart
                bars={nutrition!.days.map((d) => ({
                  key: d.date,
                  label: shortDate(d.date),
                  detail: shortDate(d.date),
                  value: d.consumed.calories,
                }))}
                reference={latestTarget ? { value: latestTarget.calories } : null}
                formatValue={(v) => `${fmt(v)} kcal`}
                accessibilityLabel={t("Biểu đồ calo 7 ngày qua")}
              />
            }
            rows={
              hasNutrition
                ? [...nutrition!.days].reverse().map((d) => ({
                    key: d.date,
                    label: shortDate(d.date),
                    value: d.logged
                      ? `${fmt(d.consumed.calories)}${d.target ? ` / ${fmt(d.target.calories)}` : ""} kcal`
                      : t("Chưa ghi"),
                  }))
                : []
            }
            emptyText={t("Chưa ghi món ăn nào trong 7 ngày qua.")}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: spacing.lg, gap: spacing.lg },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
  segmentTextSelected: { color: colors.text, fontWeight: "700" },
  headline: { flexDirection: "row", alignItems: "baseline", gap: spacing.md, flexWrap: "wrap" },
  hero: { fontSize: 32, fontWeight: "700", color: colors.text },
  delta: { fontSize: 14, color: colors.textMuted },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 17, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xs },
  linkText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.primary },
  pressed: { opacity: 0.6 },
}));
