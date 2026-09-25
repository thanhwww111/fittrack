import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { exerciseApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, MUSCLE_ORDER } from "@/lib/workout";
import type { Equipment, Exercise, MuscleGroup } from "@/types/models";

const MUSCLE_OPTIONS: ChipOption<MuscleGroup>[] = MUSCLE_ORDER.map((m) => ({
  value: m,
  label: MUSCLE_LABELS[m],
}));

const EQUIPMENT_OPTIONS: ChipOption<Equipment>[] = (
  Object.keys(EQUIPMENT_LABELS) as Equipment[]
).map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }));

interface CreateExerciseFormProps {
  initialName: string;
  initialMuscle: MuscleGroup | null;
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}

// Bài tập tự tạo chỉ hiện với chính user đó, dùng được trong template và buổi tập như bài có sẵn
export function CreateExerciseForm({
  initialName,
  initialMuscle,
  onCreated,
  onCancel,
}: CreateExerciseFormProps) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup | null>(initialMuscle);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return setError("Vui lòng nhập tên bài tập");
    if (!muscle) return setError("Chọn nhóm cơ chính");
    if (!equipment) return setError("Chọn dụng cụ");

    setError(null);
    setSaving(true);
    try {
      onCreated(await exerciseApi.create({ name: name.trim(), muscleGroup: muscle, equipment }));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Card title="Tạo bài tập mới">
      <ErrorBanner message={error} />
      <TextField label="Tên bài tập" value={name} onChangeText={setName} maxLength={100} />
      <ChipGroup label="Nhóm cơ" options={MUSCLE_OPTIONS} value={muscle} onChange={setMuscle} />
      <ChipGroup label="Dụng cụ" options={EQUIPMENT_OPTIONS} value={equipment} onChange={setEquipment} />
      <View style={styles.actions}>
        <Button title="Huỷ" variant="secondary" onPress={onCancel} style={styles.flex} />
        <Button title="Tạo và chọn" onPress={handleCreate} loading={saving} style={styles.flex} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.md },
});
