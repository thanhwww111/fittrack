import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { sessionApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { formatDate, formatDuration, formatVolume, formatWeight } from "@/lib/workout";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { PersonalRecord, WorkoutSession } from "@/types/models";

export default function WorkoutDashboardScreen() {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const templates = useWorkoutStore((s) => s.templates);
  const start = useWorkoutStore((s) => s.start);

  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { loadActive, loadTemplates } = useWorkoutStore.getState();
    try {
      const [history, prs] = await Promise.all([
        sessionApi.list({ status: "COMPLETED", limit: 3 }),
        sessionApi.personalRecords(),
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
        <Card style={styles.activeCard}>
          <Text style={styles.activeLabel}>Đang tập</Text>
          <Text style={styles.activeName}>{activeSession.name}</Text>
          <Text style={styles.muted}>
            {setCount} set · {formatVolume(activeSession.totalVolume)}
          </Text>
          <Button title="Tiếp tục buổi tập" onPress={() => router.push("/workout/start")} />
        </Card>
      ) : (
        <Card title="Bắt đầu tập">
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
            <Ionicons name="list-outline" size={20} color={colors.primary} />
            <Text style={styles.linkText}>Template</Text>
          </Pressable>
        </Link>
        <Link href="/workout/history" asChild>
          <Pressable style={styles.linkButton}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
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

      <Card title="Buổi tập gần đây">
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

      <Card title="Kỷ lục cá nhân">
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
  activeCard: { borderColor: colors.primary, borderWidth: 2 },
  activeLabel: { fontSize: 13, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  activeName: { fontSize: 22, fontWeight: "700", color: colors.text },
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
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  linkText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  volume: { fontSize: 15, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  prRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
}));
