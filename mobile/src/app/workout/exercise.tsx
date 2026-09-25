import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import { exerciseApi } from "@/api/workoutApi";
import { ChartCard } from "@/components/charts/ChartCard";
import { LineChart } from "@/components/charts/LineChart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { CreateExerciseForm } from "@/components/workout/CreateExerciseForm";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { EQUIPMENT_LABELS, formatDate, formatVolume, formatWeight, MUSCLE_LABELS } from "@/lib/workout";
import type { ExerciseHistory } from "@/types/models";

const DAY_MS = 86_400_000;
const shortDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// Tiến bộ của một bài tập: kỷ lục, biểu đồ theo thời gian, các buổi đã tập
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<ExerciseHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      exerciseApi
        .history(id, 30)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((err) => setError(errorMessage(err)));
    }, [id])
  );

  if (!data) {
    return (
      <View style={styles.center}>
        {error ? <ErrorBanner message={error} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const { exercise, record, entries } = data;
  // Bài bodyweight không có tạ → theo dõi số rep tốt nhất thay cho 1RM
  const useReps = entries.length > 0 && entries.every((e) => e.best.estimatedOneRepMax === 0);
  const chronological = [...entries].reverse();
  const first = chronological[0] ? Date.parse(chronological[0].date) : 0;
  const last = chronological.at(-1) ? Date.parse(chronological.at(-1)!.date) : 0;
  const span = Math.max(DAY_MS, last - first);
  const points = chronological.map((e) => ({
    x: (Date.parse(e.date) - first) / span,
    label: shortDay(e.date),
    value: useReps ? e.best.maxReps : e.best.estimatedOneRepMax,
  }));
  const formatPoint = (v: number) => (useReps ? `${v} rep` : formatWeight(v));

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Xoá bài tập này?",
      message: "Các buổi tập cũ vẫn giữ tên bài. Bài đang nằm trong template thì cần gỡ khỏi template trước.",
      confirmText: "Xoá",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await exerciseApi.remove(exercise.id);
      router.back();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? `Bài tập đang nằm trong template: ${err.message.split(": ")[1] ?? ""}. Gỡ khỏi template rồi thử lại.`
          : errorMessage(err)
      );
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: exercise.name }} />

      <ErrorBanner message={error} />

      {editing ? (
        <CreateExerciseForm
          exercise={exercise}
          onSaved={(updated) => {
            setData({ ...data, exercise: updated });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <Text style={styles.meta}>
            {MUSCLE_LABELS[exercise.muscleGroup]} · {EQUIPMENT_LABELS[exercise.equipment]}
            {exercise.isCustom ? " · Của bạn" : ""}
          </Text>
          {exercise.description ? <Text style={styles.body}>{exercise.description}</Text> : null}
          {exercise.isCustom ? (
            <View style={styles.actions}>
              <Button title="Sửa" variant="secondary" onPress={() => setEditing(true)} style={styles.flex} />
              <Button
                title="Xoá"
                variant="danger"
                onPress={handleDelete}
                loading={deleting}
                style={styles.flex}
              />
            </View>
          ) : null}
        </Card>
      )}

      <View style={styles.stats}>
        <Stat label="Tạ nặng nhất" value={record && record.maxWeight > 0 ? formatWeight(record.maxWeight) : "—"} />
        <Stat label="1RM ước tính" value={record && record.estimatedOneRepMax > 0 ? formatWeight(record.estimatedOneRepMax) : "—"} />
        <Stat label="Nhiều rep nhất" value={record ? String(record.maxReps) : "—"} />
      </View>

      <ChartCard
        title={useReps ? "Số rep tốt nhất mỗi buổi" : "1RM ước tính mỗi buổi"}
        subtitle={useReps ? undefined : "Tính từ set tốt nhất theo công thức Epley"}
        chart={
          <LineChart
            points={points}
            formatValue={formatPoint}
            accessibilityLabel={`Biểu đồ tiến bộ ${exercise.name}, ${points.length} buổi`}
          />
        }
        rows={entries.map((e) => ({
          key: e.sessionId,
          label: shortDay(e.date),
          value: formatPoint(useReps ? e.best.maxReps : e.best.estimatedOneRepMax),
        }))}
        emptyText="Chưa tập bài này trong buổi nào đã hoàn thành."
      />

      {entries.length > 0 ? <Text style={styles.sectionTitle}>Các buổi gần đây</Text> : null}
      {entries.map((e) => (
        <Pressable
          key={e.sessionId}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/workout/session", params: { id: e.sessionId } })}
          style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
        >
          <View style={styles.entryHeader}>
            <Text style={styles.entryName}>{e.sessionName}</Text>
            <Text style={styles.muted}>{formatDate(e.date)}</Text>
          </View>
          <Text style={styles.body}>
            {e.sets.map((s) => `${s.weight > 0 ? formatWeight(s.weight) : "BW"}×${s.reps}`).join("  ·  ")}
          </Text>
          <Text style={styles.muted}>Volume {formatVolume(e.volume)}</Text>
        </Pressable>
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

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  meta: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.md },
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
  statValue: { fontSize: 17, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 12, color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  entry: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  entryName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  pressed: { opacity: 0.6 },
}));
