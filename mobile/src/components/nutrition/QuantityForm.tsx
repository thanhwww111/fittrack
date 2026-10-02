import { Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { UNIT_LABELS } from "@/lib/nutrition";
import { useMeals } from "@/hooks/useMeals";
import type { MealType, NutritionValues, ServingUnit } from "@/types/models";
import { MacroChips } from "./MacroChips";

interface QuantityFormProps {
  quantity: string;
  onQuantityChange: (value: string) => void;
  quantityError?: string;
  unit: ServingUnit;
  mealType: MealType;
  onMealTypeChange: (value: MealType) => void;
  preview: NutritionValues | null;
}

// Phần nhập khối lượng + chọn bữa + xem trước dinh dưỡng, dùng ở màn add và detail
export function QuantityForm({
  quantity,
  onQuantityChange,
  quantityError,
  unit,
  mealType,
  onMealTypeChange,
  preview,
}: QuantityFormProps) {
  const { meals, error } = useMeals();
  return (
    <Card>
      <Text style={styles.previewLabel}>Số lượng ({UNIT_LABELS[unit]})</Text>
      <NumberStepper
        label="Số lượng thực phẩm"
        value={quantity}
        onChangeText={onQuantityChange}
        error={!!quantityError}
        min={0}
        max={10000}
        decimal
        positive
      />
      {quantityError ? <Text style={styles.error}>{quantityError}</Text> : null}
      <ErrorBanner message={error} />
      <ChipGroup label="Bữa" options={meals.map((meal) => ({ value: meal.id, label: meal.name }))} value={mealType} onChange={onMealTypeChange} />
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Dinh dưỡng</Text>
        {preview ? (
          <MacroChips values={preview} size="lg" />
        ) : (
          <Text style={styles.muted}>Nhập khối lượng để xem dinh dưỡng</Text>
        )}
      </View>
    </Card>
  );
}

const styles = themedStyles(() => ({
  error: { fontSize: 13, color: colors.danger },
  preview: { gap: spacing.sm },
  previewLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
}));
