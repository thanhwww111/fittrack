import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ElapsedClock } from "@/components/workout/ElapsedClock";
import { ExerciseLogger } from "@/components/workout/ExerciseLogger";
import { RestTimer } from "@/components/workout/RestTimer";
import { SessionInfoEditor } from "@/components/workout/SessionInfoEditor";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { DEFAULT_REST_SECONDS, formatVolume, RECORD_LABELS } from "@/lib/workout";
import { useExercisePickerStore } from "@/stores/exercisePickerStore";
import { useWorkoutStore } from "@/stores/workoutStore";

export default function ActiveWorkoutScreen() {
  const session = useWorkoutStore((s) => s.activeSession);
  const pending = useWorkoutStore((s) => s.pendingExercises);
  const prAlert = useWorkoutStore((s) => s.prAlert);
  const isLoading = useWorkoutStore((s) => s.isLoading);
  const { recordSet, removeSet, complete, cancel, addExercise, clearPrAlert, updateInfo } =
    useWorkoutStore.getState();
  const [editingInfo, setEditingInfo] = useState(false);
  const openPicker = useExercisePickerStore((s) => s.open);

  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Mở thẳng màn này (app khởi động lại giữa buổi tập) thì tải buổi đang tập từ server
  useEffect(() => {
    if (!useWorkoutStore.getState().activeSession) {
      useWorkoutStore.getState().loadActive();
    }
  }, []);

  // Thông báo PR tự ẩn sau vài giây
  useEffect(() => {
    if (!prAlert) return;
    const timer = setTimeout(clearPrAlert, 4000);
    return () => clearTimeout(timer);
  }, [prAlert, clearPrAlert]);

  if (!session) {
    return (
      <View style={styles.center}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.muted}>Không có buổi tập nào đang diễn ra.</Text>
            <Button title="Quay lại" variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  const exercises = [...session.exercises, ...pending];
  const setCount = session.exercises.reduce((n, e) => n + e.sets.length, 0);

  function handleAddExercise() {
    openPicker(
      addExercise,
      exercises.map((e) => e.exerciseId)
    );
    router.push("/workout/exercises");
  }

  async function handleFinish() {
    const ok = await confirmAction({
      title: "Hoàn thành buổi tập?",
      message: `${setCount} set · ${formatVolume(session!.totalVolume)}. Bài chưa có set nào sẽ bị bỏ qua.`,
      confirmText: "Hoàn thành",
    });
    if (!ok) return;

    setFinishing(true);
    setError(null);
    try {
      const result = await complete();
      router.replace({ pathname: "/workout/session", params: { id: result.session.id } });
    } catch (err) {
      setError(errorMessage(err));
      setFinishing(false);
    }
  }

  async function handleCancel() {
    const ok = await confirmAction({
      title: "Huỷ buổi tập?",
      message: "Các set đã ghi sẽ không được tính vào lịch sử và PR.",
      confirmText: "Huỷ buổi tập",
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancel();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: session.name }} />

      <View style={styles.statusBar}>
        <ElapsedClock startedAt={session.startedAt} style={styles.clock} />
        <Text style={styles.statusText}>
          {setCount} set · {formatVolume(session.totalVolume)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {prAlert ? (
          <View style={styles.prBanner} accessibilityRole="alert">
            <Text style={styles.prTitle}>🏆 PR mới: {prAlert.exerciseName}</Text>
            <Text style={styles.prText}>
              {prAlert.improved.map((f) => RECORD_LABELS[f]).join(", ")}
            </Text>
          </View>
        ) : null}

        <ErrorBanner message={error} />

        {exercises.map((exercise) => (
          <ExerciseLogger
            key={exercise.exerciseId}
            exercise={exercise}
            onRecord={async (input) => {
              await recordSet({ exerciseId: exercise.exerciseId, ...input });
              // Chỉ hẹn giờ nghỉ khi ghi set mới, sửa set cũ thì không
              if (!input.setNumber) {
                const rest = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
                if (rest > 0) setRestEndsAt(Date.now() + rest * 1000);
              }
            }}
            onRemoveSet={(setNumber) => removeSet(exercise.exerciseId, setNumber)}
          />
        ))}

        {exercises.length === 0 ? (
          <Text style={styles.empty}>Thêm bài tập đầu tiên để bắt đầu ghi set.</Text>
        ) : null}

        <Button title="+ Thêm bài tập" variant="secondary" onPress={handleAddExercise} />

        {editingInfo ? (
          <SessionInfoEditor
            name={session.name}
            notes={session.notes ?? ""}
            onSave={updateInfo}
            onClose={() => setEditingInfo(false)}
          />
        ) : (
          <Button
            title={session.notes ? `📝 ${session.notes}` : "✎ Đổi tên / thêm ghi chú"}
            variant="secondary"
            onPress={() => setEditingInfo(true)}
          />
        )}
        <Button
          title="Hoàn thành buổi tập"
          onPress={handleFinish}
          loading={finishing}
          disabled={setCount === 0}
        />
        <Button title="Huỷ buổi tập" variant="danger" onPress={handleCancel} />
      </ScrollView>

      {restEndsAt ? (
        <View style={styles.restWrapper}>
          <RestTimer
            endsAt={restEndsAt}
            onAdjust={(delta) =>
              setRestEndsAt((prev) => (prev ? Math.max(Date.now(), prev + delta * 1000) : prev))
            }
            onDismiss={() => setRestEndsAt(null)}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.lg },
  muted: { fontSize: 15, color: colors.textMuted },
  statusBar: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  clock: { fontSize: 24, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  statusText: { fontSize: 15, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
  prBanner: {
    backgroundColor: colors.highlight,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  prTitle: { fontSize: 16, fontWeight: "700", color: colors.highlightText },
  prText: { fontSize: 14, color: colors.highlightText },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.lg },
  restWrapper: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.xl },
}));
