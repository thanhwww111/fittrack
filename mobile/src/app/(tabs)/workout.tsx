import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { programApi, sessionApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { GradientView } from "@/components/ui/GradientView";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { dayName, programDayFor } from "@/lib/goal";
import { formatDate, formatDuration, formatVolume, formatWeight } from "@/lib/workout";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { PersonalRecord, WeeklyProgramList, WorkoutSession } from "@/types/models";

export default function WorkoutDashboardScreen() {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const templates = useWorkoutStore((s) => s.templates);
  const start = useWorkoutStore((s) => s.start);

  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [programs, setPrograms] = useState<WeeklyProgramList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { loadActive, loadTemplates } = useWorkoutStore.getState();
    try {
      const [history, prs, programList] = await Promise.all([
        sessionApi.list({ status: "COMPLETED", limit: 3 }),
        sessionApi.personalRecords(),
        programApi.list(),
        loadActive(),
        loadTemplates(),
      ]);
      setRecent(history.items);
      setRecords(prs);
      setPrograms(programList);
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

  async function handleStart(key: string, input: { templateId?: string; name?: string }) {
    setStarting(key);
    setError(null);
    try {
      await start(input);
      router.push("/workout/start");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(null);
    }
  }

  const favorites = programs?.items.filter((p) => p.isFavorite) ?? [];
  const today = programs?.todayDayOfWeek ?? null;

  const setCount = activeSession?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <ErrorBanner message={error} />

      {activeSession ? (
        <GradientView style={styles.hero}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.heroLabel}>Đang tập</Text>
          </View>
          <Text style={styles.heroName}>{activeSession.name}</Text>
          <Text style={styles.heroMuted}>
            {activeSession.exercises.length} bài · {setCount} set · {formatVolume(activeSession.totalVolume)}
          </Text>
          <Button title="Tiếp tục buổi tập" variant="light" onPress={() => router.push("/workout/start")} />
        </GradientView>
      ) : null}

      {!activeSession && favorites.length > 0 && today !== null ? (
        <GradientView style={styles.hero}>
          <Text style={styles.heroLabel}>Lịch tuần · {dayName(today)}</Text>
          {favorites.map((program) => {
            const day = programDayFor(program, today);
            return day ? (
              <Pressable
                key={program.id}
                accessibilityRole="button"
                accessibilityLabel={`Bắt đầu ${day.templateName} theo lịch ${program.name}`}
                disabled={starting !== null}
                onPress={() => handleStart(day.templateId, { templateId: day.templateId })}
                style={({ pressed }) => [styles.programRow, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.heroName}>{day.templateName}</Text>
                  <Text style={styles.heroMuted}>
                    {program.name} · {day.exerciseCount} bài tập
                  </Text>
                </View>
                <Ionicons
                  name={starting === day.templateId ? "hourglass-outline" : "play-circle"}
                  size={48}
                  color={colors.onGradient}
                />
              </Pressable>
            ) : (
              <Text key={program.id} style={styles.heroMuted}>
                {program.name}: hôm nay nghỉ, hồi phục cho buổi sau 💤
              </Text>
            );
          })}
        </GradientView>
      ) : null}

      {activeSession ? null : (
        <Card title="Bắt đầu tập" icon="play">
          {templates.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Bắt đầu ${t.name}`}
              disabled={starting !== null}
              onPress={() => handleStart(t.id, { templateId: t.id })}
              style={({ pressed }) => [styles.templateRow, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.templateName}>{t.name}</Text>
                <Text style={styles.muted}>{t.exercises.length} bài tập</Text>
              </View>
              <Ionicons
                name={starting === t.id ? "hourglass-outline" : "play-circle"}
                size={30}
                color={colors.primary}
              />
            </Pressable>
          ))}
          {templates.length === 0 ? (
            <Text style={styles.muted}>
              Tạo template như “Push Day” để bắt đầu nhanh với bài tập và số set có sẵn.
            </Text>
          ) : null}
          <Button
            title="Buổi tập trống"
            variant="secondary"
            loading={starting === "empty"}
            disabled={starting !== null}
            onPress={() => handleStart("empty", { name: "Buổi tập" })}
          />
        </Card>
      )}

      <View style={styles.linkRow}>
        <Link href="/workout/templates" asChild>
          <Pressable style={styles.linkButton}>
            <Ionicons name="list-outline" size={20} color={colors.primaryText} />
            <Text style={styles.linkText}>Template</Text>
          </Pressable>
        </Link>
        <Link href="/workout/programs" asChild>
          <Pressable style={styles.linkButton}>
            <Ionicons name="calendar-outline" size={20} color={colors.primaryText} />
            <Text style={styles.linkText}>Lịch tuần</Text>
          </Pressable>
        </Link>
        <Link href="/workout/history" asChild>
          <Pressable style={styles.linkButton}>
            <Ionicons name="time-outline" size={20} color={colors.primaryText} />
            <Text style={styles.linkText}>Lịch sử</Text>
          </Pressable>
        </Link>
      </View>

      {recent.length > 0 ? (
        <Button
          title="✨ Phân tích 4 tuần bằng AI"
          variant="secondary"
          onPress={() => router.push("/ai/workout")}
        />
      ) : null}

      <Card title="Buổi tập gần đây" icon="time">
        {recent.length === 0 ? (
          <Text style={styles.muted}>Chưa có buổi tập nào hoàn thành.</Text>
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

      <Card title="Kỷ lục cá nhân" icon="trophy">
        {records.length === 0 ? (
          <Text style={styles.muted}>Hoàn thành buổi tập đầu tiên để ghi nhận PR.</Text>
        ) : (
          records.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Xem tiến bộ ${r.exerciseName}`}
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
