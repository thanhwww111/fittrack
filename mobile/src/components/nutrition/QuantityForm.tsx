import { Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { MEAL_LABELS, MEAL_ORDER, UNIT_LABELS } from "@/lib/nutrition";
import type { MealType, NutritionValues, ServingUnit } from "@/types/models";
import { MacroChips } from "./MacroChips";

const MEAL_OPTIONS: ChipOption<MealType>[] = MEAL_ORDER.map((m) => ({
  value: m,
  label: MEAL_LABELS[m],
}));

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
  return (
    <Card>
      <TextField
        label="Khối lượng"
        suffix={UNIT_LABELS[unit]}
        value={quantity}
        onChangeText={onQuantityChange}
        error={quantityError}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
      <ChipGroup label="Bữa" options={MEAL_OPTIONS} value={mealType} onChange={onMealTypeChange} />
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
  preview: { gap: spacing.sm },
  previewLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
}));
