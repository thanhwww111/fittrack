import { translate as t, useTranslation } from "@/i18n";
import { ScheduledWorkoutCard } from "@/components/workout/ScheduledWorkoutCard";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { programApi, sessionApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";

import { formatDate, formatDuration, formatVolume, formatWeight } from "@/lib/workout";
import { useWorkoutStore } from "@/stores/workoutStore";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import type { PersonalRecord, WorkoutSession } from "@/types/models";

export default function WorkoutDashboardScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const { loadActive, loadTemplates } = useWorkoutStore.getState();
    try {
      const [history, prs] = await Promise.all([
        sessionApi.list({ status: "COMPLETED", limit: 3 }),
        sessionApi.personalRecords(),
        programApi.list(),
        loadActive(),
        loadTemplates(),
      ]);
      setRecent(history.items);
      setRecords(prs);

      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView
      testID="workout-dashboard"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([load(), useTrainingScheduleStore.getState().load()]);
            setRefreshing(false);
          }}
        />
      }
    >
      <ErrorBanner message={error} />

      <ScheduledWorkoutCard />
      <View style={styles.linkRow}>

        <Link href="/workout/programs" asChild>
          <Pressable style={styles.linkButton}>
            <Ionicons name="calendar-outline" size={20} color={colors.primaryText} />
            <Text style={styles.linkText}>{t("Lịch tuần")}</Text>
          </Pressable>
        </Link>
        <Link href="/workout/history" asChild>
          <Pressable style={styles.linkButton}>
            <Ionicons name="time-outline" size={20} color={colors.primaryText} />
            <Text style={styles.linkText}>{t("Lịch sử")}</Text>
          </Pressable>
        </Link>
      </View>

      {recent.length > 0 ? (
        <Button
          title={t("✨ Phân tích 4 tuần bằng AI")}
          variant="secondary"
          onPress={() => router.push("/ai/workout")}
        />
      ) : null}

      <Card title={t("Buổi tập gần đây")} icon="time">
        {recent.length === 0 ? (
          <Text style={styles.muted}>{t("Chưa có buổi tập nào hoàn thành.")}</Text>
        ) : (
          recent.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: "/workout/session", params: { id: s.id } })}
              style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.templateName}>{s.name}</Text>
                <Text style={styles.muted}>
                  {formatDate(s.completedAt ?? s.startedAt)} · {formatDuration(s.duration)}
                </Text>
              </View>
              <Text style={styles.volume}>{formatVolume(s.totalVolume)}</Text>
            </Pressable>
          ))
        )}
      </Card>

      <Card title={t("Kỷ lục cá nhân")} icon="trophy">
        {records.length === 0 ? (
          <Text style={styles.muted}>{t("Hoàn thành buổi tập đầu tiên để ghi nhận PR.")}</Text>
        ) : (
          records.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={t("Xem tiến bộ {value1}", { value1: r.exerciseName })}
              onPress={() => router.push({ pathname: "/workout/exercise", params: { id: r.exerciseId } })}
              style={({ pressed }) => [styles.prRow, pressed && styles.pressed]}
            >
              <View style={styles.prBadge}>
                <Ionicons name="trophy" size={16} color={colors.highlightText} />
              </View>
              <Text style={[styles.templateName, styles.flex]} numberOfLines={1}>
                {r.exerciseName}
              </Text>
              <Text style={styles.muted}>
                {r.maxWeight > 0 ? formatWeight(r.maxWeight) : `${r.maxReps} rep`}
                {r.estimatedOneRepMax > 0 ? ` · 1RM ~${formatWeight(r.estimatedOneRepMax)}` : ""}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  content: { padding: spacing.lg, gap: spacing.lg },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  muted: { fontSize: 14, color: colors.textMuted },
  hero: { padding: spacing.xl, gap: spacing.sm },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onGradientMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroName: { fontSize: 22, fontWeight: "800", color: colors.onGradient, letterSpacing: -0.3 },
  heroMuted: { fontSize: 14, color: colors.onGradientMuted },
  liveRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.onGradient },
  programRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  prBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.highlight,
  },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  templateName: { fontSize: 16, fontWeight: "600", color: colors.text },
  linkRow: { flexDirection: "row", gap: spacing.md },
  linkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  linkText: { fontSize: 15, fontWeight: "700", color: colors.primaryText },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  volume: { fontSize: 15, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  prRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
}));
