import { translate as t, useTranslation } from "@/i18n";
import { useDraftState, clearFormDrafts } from "@/hooks/useDraftState";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { templateApi, programApi, exerciseApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { DEFAULT_REST_SECONDS } from "@/lib/workout";
import { useExercisePickerStore } from "@/stores/exercisePickerStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { WorkoutTemplate } from "@/types/models";
import { ExerciseNote } from "@/components/workout/ExerciseNote";
import { ExerciseGuideButton } from "@/components/workout/ExerciseGuideButton";

interface DraftExercise {
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

// Khớp giới hạn ở server (schemas/workout.schema.ts)
const LIMITS = {
  sets: { min: 1, max: 20, label: "Set" },
  reps: { min: 1, max: 100, label: "Rep" },
  rest: { min: 0, max: 900, get label() { return t("Nghỉ (giây)"); } },
} as const;

type NumberKey = keyof typeof LIMITS;

function toDraft(template: WorkoutTemplate): DraftExercise[] {
  return [...template.exercises]
    .sort((a, b) => a.order - b.order)
    .map((e) => ({
      exerciseId: typeof e.exerciseId === "string" ? e.exerciseId : e.exerciseId.id,
      name: typeof e.exerciseId === "string" ? t("Bài tập") : e.exerciseId.name,
      sets: String(e.targetSets),
      reps: String(e.targetReps),
      rest: String(e.restSeconds),
    }));
}

export default function TemplateEditorScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    templateApi
      .get(id)
      .then(setTemplate)
      .catch((err) => setLoadError(errorMessage(err)));
  }, [id]);

  if (id && !template) {
    return (
      <View style={styles.center}>
        {loadError ? <ErrorBanner message={loadError} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return <TemplateForm key={template?.id ?? "new"} template={template} />;
}

function TemplateForm({ template }: { template: WorkoutTemplate | null }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const saveTemplate = useWorkoutStore((s) => s.saveTemplate);
  const deleteTemplate = useWorkoutStore((s) => s.deleteTemplate);
  const openPicker = useExercisePickerStore((s) => s.open);

  const draftKey = `template-${template?.id ?? "new"}`;
  const [name, setName] = useDraftState(draftKey + "name", template?.name ?? "");
  const [exercises, setExercises] = useDraftState<DraftExercise[]>(draftKey + "exercises", template ? toDraft(template) : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  async function chooseSplit(key: "upper" | "lower") {
    if (loadingSuggestion || saving) return;
    if (exercises.length && !await confirmAction({
      title: t("Thay bài tập đang soạn?"), message: t("Bộ bài Upper/Lower sẽ thay danh sách bài hiện tại."), confirmText: t("Thay bài tập"),
    })) return;
    setLoadingSuggestion(true);
    setFormError(null);
    try {
      const [presets, library] = await Promise.all([programApi.presets(), exerciseApi.list({})]);
      const workout = presets.find(p => p.key === "upper-lower-4")?.days[key === "upper" ? 0 : 1];
      if (!workout) throw new Error("Missing preset");
      const draft = workout.exercises.map(e => {
        const exercise = library.find(item => !item.isCustom && item.name === e.name);
        if (!exercise) throw new Error("Missing exercise");
        return { exerciseId: exercise.id, name: exercise.name, sets: String(e.sets), reps: String(e.reps), rest: String(e.rest) };
      });
      setName(key === "upper" ? t("Upper (thân trên)") : t("Lower (thân dưới)"));
      setExercises(draft);
      setErrors({});
    } catch {
      setFormError(t("Chưa tải được bộ bài tập. Kiểm tra kết nối và thư viện bài tập, rồi thử lại."));
    } finally { setLoadingSuggestion(false); }
  }

  function addExercise() {
    openPicker(
      (exercise) =>
        setExercises((prev) => [
          ...prev,
          {
            exerciseId: exercise.id,
            name: exercise.name,
            sets: "3",
            reps: "10",
            rest: String(DEFAULT_REST_SECONDS),
          },
        ]),
      exercises.map((e) => e.exerciseId)
    );
    router.push("/workout/exercises");
  }

  function update(index: number, key: NumberKey, value: string) {
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, [key]: value } : e)));
  }

  function move(index: number, delta: -1 | 1) {
    setExercises((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = t("Vui lòng nhập tên template");
    if (exercises.length === 0) nextErrors.exercises = t("Thêm ít nhất một bài tập");

    const payload = exercises.map((e, i) => {
      const values = {} as Record<NumberKey, number>;
      for (const key of Object.keys(LIMITS) as NumberKey[]) {
        const n = Number(e[key]);
        const { min, max, label } = LIMITS[key];
        if (!Number.isInteger(n) || n < min || n > max) {
          nextErrors[`${i}.${key}`] = `${label}: ${min}–${max}`;
        }
        values[key] = n;
      }
      return {
        exerciseId: e.exerciseId,
        targetSets: values.sets,
        targetReps: values.reps,
        restSeconds: values.rest,
      };
    });

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await saveTemplate(template?.id ?? null, { name: name.trim(), exercises: payload });
      clearFormDrafts(draftKey);
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  // Tạo bản sao rồi mở luôn bản sao để sửa (vd "Push A" → "Push B")
  async function handleDuplicate() {
    if (!template) return;
    setDuplicating(true);
    setFormError(null);
    try {
      const copy = await templateApi.duplicate(template.id);
      router.replace({ pathname: "/workout/template", params: { id: copy.id } });
    } catch (err) {
      setFormError(errorMessage(err));
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!template) return;
    const ok = await confirmAction({
      title: t("Xoá template?"),
      message: t("\"{value1}\" sẽ bị xoá. Các buổi tập cũ vẫn được giữ.", { value1: template.name }),
      confirmText: t("Xoá"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTemplate(template.id);
      clearFormDrafts(draftKey);
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: template ? t("Sửa template") : t("Tạo template") }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={formError} />
        {!template ? <Card title={t("Điền từ buổi tập đề xuất")}>
          <Button title={t("Upper (thân trên)")} variant="secondary" disabled={saving || loadingSuggestion} onPress={() => chooseSplit("upper")} />
          <Button title={t("Lower (thân dưới)")} variant="secondary" disabled={saving || loadingSuggestion} onPress={() => chooseSplit("lower")} />
          <Text style={styles.numberLabel}>{t("Điền sẵn bài, set và rep. Bạn có thể chỉnh trước khi lưu.")}</Text>
          {loadingSuggestion ? <ActivityIndicator color={colors.primary} /> : null}
        </Card> : null}

        <TextField
          label={t("Tên template")}
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder={t("Ví dụ: Push Day")}
        />

        {exercises.map((e, index) => (
          <Card key={e.exerciseId}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {index + 1}. {e.name}
              </Text>
              <IconButton
                icon="arrow-up"
                label={t("Lên")}
                disabled={index === 0}
                onPress={() => move(index, -1)}
              />
              <IconButton
                icon="arrow-down"
                label={t("Xuống")}
                disabled={index === exercises.length - 1}
                onPress={() => move(index, 1)}
              />
              <IconButton icon="trash-outline" label={t("Xoá")} danger onPress={() => remove(index)} />
            </View>
            <View style={styles.numberRow}>
              <ExerciseNote name={e.name} />
              <ExerciseGuideButton name={e.name} />
              {(Object.keys(LIMITS) as NumberKey[]).map((key) => (
                <View key={key} style={styles.numberField}>
                  <Text style={styles.numberLabel}>{LIMITS[key].label}</Text>
                  {key !== "rest" ? <NumberStepper
                    value={e[key]}
                    onChangeText={(v) => update(index, key, v)}
                    label={t("{value1} của {value2}", { value1: LIMITS[key].label, value2: e.name })}
                    min={LIMITS[key].min}
                    max={LIMITS[key].max}
                    error={!!errors[`${index}.${key}`]}
                    disabled={saving}
                  /> : <TextInput
                    value={e[key]}
                    onChangeText={(v) => update(index, key, v)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    accessibilityLabel={t("{value1} của {value2}", { value1: LIMITS[key].label, value2: e.name })}
                    style={[styles.numberInput, errors[`${index}.${key}`] && styles.inputError]}
                  />}
                </View>
              ))}
            </View>
            {(Object.keys(LIMITS) as NumberKey[]).map((key) =>
              errors[`${index}.${key}`] ? (
                <Text key={key} style={styles.error}>
                  {errors[`${index}.${key}`]}
                </Text>
              ) : null
            )}
          </Card>
        ))}

        {errors.exercises ? <Text style={styles.error}>{errors.exercises}</Text> : null}

        <Button title={t("+ Thêm bài tập")} variant="secondary" onPress={addExercise} />
        <Button title={t("Lưu template")} onPress={handleSave} loading={saving} disabled={loadingSuggestion} />
        {template ? (
          <Button
            title={t("Nhân bản template")}
            variant="secondary"
            onPress={handleDuplicate}
            loading={duplicating}
          />
        ) : null}
        {template ? <Button title={t("Xoá template")} variant="danger" onPress={handleDelete} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: "arrow-up" | "arrow-down" | "trash-outline";
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  exerciseName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  iconButton: { padding: spacing.xs, borderRadius: radius.sm },
  disabled: { opacity: 0.3 },
  numberRow: { gap: spacing.md },
  numberField: { gap: spacing.xs },
  numberLabel: { fontSize: 13, color: colors.textMuted },
  numberInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    textAlign: "center",
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 13, color: colors.danger },
}));
