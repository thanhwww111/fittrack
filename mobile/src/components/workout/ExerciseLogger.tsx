import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage, parseNumber } from "@/lib/formErrors";
import { formatWeight } from "@/lib/workout";
import type { SessionExercise, WorkoutSet } from "@/types/models";

interface ExerciseLoggerProps {
  exercise: SessionExercise;
  onRecord: (input: { weight: number; reps: number; setNumber?: number }) => Promise<void>;
  onRemoveSet: (setNumber: number) => Promise<void>;
}

// Giá trị gợi ý cho set tiếp theo: lặp lại set gần nhất, chưa có thì lấy rep mục tiêu
function suggestion(exercise: SessionExercise) {
  const last = exercise.sets.at(-1);
  return {
    weight: last ? String(last.weight) : "",
    reps: last ? String(last.reps) : exercise.targetReps ? String(exercise.targetReps) : "",
  };
}

export function ExerciseLogger({ exercise, onRecord, onRemoveSet }: ExerciseLoggerProps) {
  const [weight, setWeight] = useState(() => suggestion(exercise).weight);
  const [reps, setReps] = useState(() => suggestion(exercise).reps);
  const [editing, setEditing] = useState<WorkoutSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const target =
    exercise.targetSets && exercise.targetReps
      ? `Mục tiêu ${exercise.targetSets} × ${exercise.targetReps}`
      : null;

  function startEdit(set: WorkoutSet) {
    setEditing(set);
    setWeight(String(set.weight));
    setReps(String(set.reps));
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    const next = suggestion(exercise);
    setWeight(next.weight);
    setReps(next.reps);
  }

  async function submit() {
    const w = parseNumber(weight) ?? 0; // để trống = bodyweight (0 kg)
    const r = parseNumber(reps);
    if (Number.isNaN(w) || w < 0 || w > 1000) {
      setError("Mức tạ từ 0 đến 1000 kg");
      return;
    }
    if (r === null || !Number.isInteger(r) || r < 1 || r > 1000) {
      setError("Số rep phải là số nguyên từ 1");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onRecord({ weight: w, reps: r, setNumber: editing?.setNumber });
      setEditing(null);
      // Giữ nguyên số vừa nhập làm gợi ý cho set sau
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.exerciseName}</Text>
        {target ? <Text style={styles.target}>{target}</Text> : null}
      </View>

      {exercise.sets.map((set) => {
        const isEditing = editing?.setNumber === set.setNumber;
        return (
          <View key={set.setNumber} style={[styles.setRow, isEditing && styles.setRowEditing]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sửa set ${set.setNumber}`}
              onPress={() => startEdit(set)}
              style={styles.setMain}
            >
              <Text style={styles.setNumber}>{set.setNumber}</Text>
              <Text style={styles.setValue}>
                {set.weight > 0 ? formatWeight(set.weight) : "Bodyweight"} × {set.reps}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xoá set ${set.setNumber}`}
              hitSlop={8}
              onPress={() => {
                if (isEditing) cancelEdit();
                onRemoveSet(set.setNumber).catch((err) => setError(errorMessage(err)));
              }}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        );
      })}

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>kg</Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
            accessibilityLabel={`Mức tạ ${exercise.exerciseName}`}
            style={styles.input}
          />
        </View>
        <Text style={styles.times}>×</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>rep</Text>
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
            accessibilityLabel={`Số rep ${exercise.exerciseName}`}
            style={styles.input}
          />
        </View>
        <Button
          title={editing ? `Lưu set ${editing.setNumber}` : `Ghi set ${exercise.sets.length + 1}`}
          onPress={submit}
          loading={saving}
          style={styles.recordButton}
        />
      </View>
      {editing ? (
        <Pressable onPress={cancelEdit} accessibilityRole="button">
          <Text style={styles.cancelEdit}>Huỷ sửa</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  header: { gap: 2 },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  target: { fontSize: 13, color: colors.textMuted },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  setRowEditing: { backgroundColor: colors.primarySoft },
  setMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  setNumber: { width: 20, fontSize: 14, fontWeight: "700", color: colors.textMuted },
  setValue: { flex: 1, fontSize: 16, color: colors.text, fontVariant: ["tabular-nums"] },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  inputGroup: { width: 72, gap: 2 },
  inputLabel: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  times: { fontSize: 18, color: colors.textMuted, paddingBottom: spacing.md },
  recordButton: { flex: 1, paddingHorizontal: spacing.sm },
  cancelEdit: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  error: { fontSize: 13, color: colors.danger },
}));
