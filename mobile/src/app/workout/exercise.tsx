import { translate as t, useTranslation } from "@/i18n";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
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
import { ExerciseNote } from "@/components/workout/ExerciseNote";
import { ExerciseGuideButton } from "@/components/workout/ExerciseGuideButton";

const DAY_MS = 86_400_000;
const shortDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// Tiến bộ của một bài tập: kỷ lục, biểu đồ theo thời gian, các buổi đã tập
export default function ExerciseDetailScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
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
      title: t("Xoá bài tập này?"),
      message: t("Các buổi tập cũ vẫn giữ tên bài. Bài đang nằm trong template thì cần gỡ khỏi template trước."),
      confirmText: t("Xoá"),
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
          ? t("Bài tập đang nằm trong template: {value1}. Gỡ khỏi template rồi thử lại.", { value1: err.message.split(": ")[1] ?? "" })
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
            {exercise.isCustom ? t(" · Của bạn") : ""}
          </Text>
          <ExerciseNote name={exercise.name} isCustom={exercise.isCustom} />
          <ExerciseGuideButton name={exercise.name} isCustom={exercise.isCustom} />
          {exercise.description ? <Text style={styles.body}>{exercise.description}</Text> : null}
          {exercise.isCustom ? (
            <View style={styles.actions}>
              <Button title={t("Sửa")} variant="secondary" onPress={() => setEditing(true)} style={styles.flex} />
              <Button
                title={t("Xoá")}
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
        <Stat label={t("Tạ nặng nhất")} value={record && record.maxWeight > 0 ? formatWeight(record.maxWeight) : "—"} />
        <Stat label={t("1RM ước tính")} value={record && record.estimatedOneRepMax > 0 ? formatWeight(record.estimatedOneRepMax) : "—"} />
        <Stat label={t("Nhiều rep nhất")} value={record ? String(record.maxReps) : "—"} />
      </View>

      <ChartCard
        title={useReps ? t("Số rep tốt nhất mỗi buổi") : t("1RM ước tính mỗi buổi")}
        subtitle={useReps ? undefined : t("Tính từ set tốt nhất theo công thức Epley")}
        chart={
          <LineChart
            points={points}
            formatValue={formatPoint}
            accessibilityLabel={t("Biểu đồ tiến bộ {value1}, {value2} buổi", { value1: exercise.name, value2: points.length })}
          />
        }
        rows={entries.map((e) => ({
          key: e.sessionId,
          label: shortDay(e.date),
          value: formatPoint(useReps ? e.best.maxReps : e.best.estimatedOneRepMax),
        }))}
        emptyText={t("Chưa tập bài này trong buổi nào đã hoàn thành.")}
      />

      {entries.length > 0 ? <Text style={styles.sectionTitle}>{t("Các buổi gần đây")}</Text> : null}
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
            {e.sets.map((s) => t("{value1}×{value2}", { value1: s.weight > 0 ? formatWeight(s.weight) : "BW", value2: s.reps })).join("  ·  ")}
          </Text>
          <Text style={styles.muted}>Volume {formatVolume(e.volume)}</Text>
        </Pressable>
      ))}
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
