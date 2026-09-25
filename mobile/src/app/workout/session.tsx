import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { sessionApi } from "@/api/workoutApi";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import {
  formatDate,
  formatDuration,
  formatVolume,
  formatWeight,
  RECORD_LABELS,
  setVolume,
} from "@/lib/workout";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { WorkoutSession } from "@/types/models";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lastCompletion = useWorkoutStore((s) => s.lastCompletion);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sessionApi
      .get(id)
      .then(setSession)
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (!session) {
    return (
      <View style={styles.center}>
        {error ? <ErrorBanner message={error} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  // Chỉ có ngay sau khi vừa hoàn thành buổi này
  const newRecords = lastCompletion?.sessionId === session.id ? lastCompletion.newRecords : [];
  const sets = session.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>{session.name}</Text>
        <Text style={styles.muted}>{formatDate(session.completedAt ?? session.startedAt)}</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Thời gian" value={formatDuration(session.duration)} />
        <Stat label="Volume" value={formatVolume(session.totalVolume)} />
        <Stat label="Số set" value={String(sets)} />
      </View>

      {newRecords.length > 0 ? (
        <View style={styles.prCard}>
          <Text style={styles.prTitle}>🏆 {newRecords.length} kỷ lục mới!</Text>
          {newRecords.map((r) => (
            <Text key={r.exerciseId} style={styles.prText}>
              {r.exerciseName}: {r.improved.map((f) => RECORD_LABELS[f]).join(", ")}
            </Text>
          ))}
        </View>
      ) : null}

      {session.exercises.map((e) => (
        <Card key={e.exerciseId}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{e.exerciseName}</Text>
            <Text style={styles.muted}>{formatVolume(setVolume(e.sets))}</Text>
          </View>
          {e.sets.map((s) => (
            <View key={s.setNumber} style={styles.setRow}>
              <Text style={styles.setNumber}>{s.setNumber}</Text>
              <Text style={styles.setValue}>
                {s.weight > 0 ? formatWeight(s.weight) : "Bodyweight"} × {s.reps}
              </Text>
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 13, color: colors.textMuted },
  prCard: { backgroundColor: "#fef3c7", borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  prTitle: { fontSize: 17, fontWeight: "700", color: "#92400e" },
  prText: { fontSize: 14, color: "#92400e" },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exerciseName: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
  setRow: { flexDirection: "row", gap: spacing.md },
  setNumber: { width: 20, fontSize: 14, fontWeight: "700", color: colors.textMuted },
  setValue: { fontSize: 15, color: colors.text, fontVariant: ["tabular-nums"] },
});
