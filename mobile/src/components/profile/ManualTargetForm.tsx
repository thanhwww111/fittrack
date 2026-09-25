import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { errorMessage, fieldErrorsFrom, parseNumber, type FieldErrors } from "@/lib/formErrors";
import type { Macros } from "@/types/models";

// Khớp giới hạn ở server (schemas/goal.schema.ts), tất cả là số nguyên
const FIELDS: { key: keyof Macros; label: string; unit: string; min: number; max: number }[] = [
  { key: "calories", label: "Calo", unit: "kcal", min: 800, max: 10000 },
  { key: "protein", label: "Protein", unit: "g", min: 0, max: 1000 },
  { key: "carbs", label: "Carbs", unit: "g", min: 0, max: 2000 },
  { key: "fat", label: "Fat", unit: "g", min: 0, max: 1000 },
];

interface ManualTargetFormProps {
  initial: Macros | null;
  onSubmit: (macros: Macros) => Promise<void>;
  onCancel: () => void;
}

export function ManualTargetForm({ initial, onSubmit, onCancel }: ManualTargetFormProps) {
  const [values, setValues] = useState<Record<keyof Macros, string>>({
    calories: initial ? String(initial.calories) : "",
    protein: initial ? String(initial.protein) : "",
    carbs: initial ? String(initial.carbs) : "",
    fat: initial ? String(initial.fat) : "",
  });
  const [errors, setErrors] = useState<FieldErrors<keyof Macros>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // kcal ước tính từ macro (4-4-9) để người dùng tự đối chiếu với số calo đã nhập
  const macroCalories = (["protein", "carbs", "fat"] as const).reduce((sum, key) => {
    const n = parseNumber(values[key]);
    return n === null || Number.isNaN(n) ? sum : sum + n * (key === "fat" ? 9 : 4);
  }, 0);

  async function handleSubmit() {
    const nextErrors: FieldErrors<keyof Macros> = {};
    const macros = {} as Macros;
    for (const field of FIELDS) {
      const n = parseNumber(values[field.key]);
      if (n === null) nextErrors[field.key] = "Bắt buộc";
      else if (!Number.isInteger(n) || n < field.min || n > field.max) {
        nextErrors[field.key] = `Số nguyên từ ${field.min} đến ${field.max}`;
      } else macros[field.key] = n;
    }
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit(macros);
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          suffix={field.unit}
          value={values[field.key]}
          onChangeText={(text) => setValues((prev) => ({ ...prev, [field.key]: text }))}
          error={errors[field.key]}
          keyboardType="number-pad"
          selectTextOnFocus
        />
      ))}
      {macroCalories > 0 ? (
        <Text style={styles.hint}>
          Protein, carbs, fat trên tương đương khoảng {Math.round(macroCalories).toLocaleString("vi-VN")} kcal.
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title="Huỷ" variant="secondary" onPress={onCancel} style={styles.flex} />
        <Button title="Lưu mục tiêu" onPress={handleSubmit} loading={saving} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { gap: spacing.md },
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.md },
  hint: { fontSize: 13, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
}));
