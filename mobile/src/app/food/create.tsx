import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { foodApi } from "@/api/foodApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing } from "@/constants/theme";
import { errorMessage, fieldErrorsFrom, parseNumber, type FieldErrors } from "@/lib/formErrors";
import { UNIT_LABELS } from "@/lib/nutrition";
import type { CreateFoodInput, ServingUnit } from "@/types/models";

const UNIT_OPTIONS: ChipOption<ServingUnit>[] = (["g", "ml", "piece"] as const).map((u) => ({
  value: u,
  label: UNIT_LABELS[u],
}));

// Khớp giới hạn ở server (schemas/food.schema.ts)
const NUMBER_FIELDS = [
  { key: "servingSize", label: "Khẩu phần", max: 10000, required: true },
  { key: "calories", label: "Calories", max: 5000, required: true, suffix: "kcal" },
  { key: "protein", label: "Protein", max: 5000, required: true, suffix: "g" },
  { key: "carbs", label: "Carbs", max: 5000, required: true, suffix: "g" },
  { key: "fat", label: "Fat", max: 5000, required: true, suffix: "g" },
  { key: "fiber", label: "Chất xơ (không bắt buộc)", max: 5000, required: false, suffix: "g" },
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number]["key"];
type Field = NumberKey | "name";

export default function CreateFoodScreen() {
  const params = useLocalSearchParams<{ name?: string; mealType?: string; date?: string }>();

  const [name, setName] = useState(params.name ?? "");
  const [unit, setUnit] = useState<ServingUnit>("g");
  const [values, setValues] = useState<Record<NumberKey, string>>({
    servingSize: "100",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
  });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const nextErrors: FieldErrors<Field> = {};
    const numbers = {} as Record<NumberKey, number>;

    if (!name.trim()) nextErrors.name = "Vui lòng nhập tên món";

    for (const field of NUMBER_FIELDS) {
      const value = parseNumber(values[field.key]);
      if (value === null) {
        if (field.required) nextErrors[field.key] = "Bắt buộc";
        else numbers[field.key] = 0;
      } else if (Number.isNaN(value) || value < 0 || value > field.max) {
        nextErrors[field.key] = `Nhập từ 0 đến ${field.max}`;
      } else if (field.key === "servingSize" && value === 0) {
        nextErrors[field.key] = "Khẩu phần phải lớn hơn 0";
      } else {
        numbers[field.key] = value;
      }
    }

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input: CreateFoodInput = { name: name.trim(), servingUnit: unit, ...numbers };
    setSaving(true);
    try {
      const food = await foodApi.create(input);
      // Tạo xong đi thẳng tới màn nhập khối lượng của món vừa tạo
      router.replace({
        pathname: "/food/add",
        params: {
          foodId: food.id,
          ...(params.mealType && { mealType: params.mealType }),
          ...(params.date && { date: params.date }),
        },
      });
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={formError} />

        <Card>
          <TextField label="Tên món" value={name} onChangeText={setName} error={errors.name} />
          <ChipGroup label="Đơn vị" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
        </Card>

        <Card title="Dinh dưỡng trên mỗi khẩu phần">
          <Text style={styles.hint}>
            Ví dụ ức gà: khẩu phần 100 g có 165 kcal, 31 g protein, 0 g carbs, 3.6 g fat.
          </Text>
          {NUMBER_FIELDS.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              suffix={field.key === "servingSize" ? UNIT_LABELS[unit] : field.suffix}
              value={values[field.key]}
              onChangeText={(text) => setValues((prev) => ({ ...prev, [field.key]: text }))}
              error={errors[field.key]}
              keyboardType="decimal-pad"
            />
          ))}
        </Card>

        <Button title="Tạo món" onPress={handleCreate} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
