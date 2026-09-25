import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { QuantityForm } from "@/components/nutrition/QuantityForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, spacing } from "@/constants/theme";
import { errorMessage, parseNumber } from "@/lib/formErrors";
import { formatServing } from "@/lib/nutrition";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { FoodLog, MealType, NutritionValues } from "@/types/models";

// Xem trước khi đổi khối lượng: scale từ snapshot của log, giống cách server tính
function rescale(log: FoodLog, quantity: number): NutritionValues | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const f = quantity / log.quantity;
  const r = (n: number) => Math.round(n * f * 10) / 10;
  return {
    calories: r(log.calories),
    protein: r(log.protein),
    carbs: r(log.carbs),
    fat: r(log.fat),
    fiber: r(log.fiber),
  };
}

export default function FoodLogDetailScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const log = useNutritionStore((s) => s.logs.find((l) => l.id === logId));

  if (!log) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Không tìm thấy món này, có thể đã bị xoá.</Text>
      </View>
    );
  }

  return <LogEditor key={log.id} log={log} />;
}

function LogEditor({ log }: { log: FoodLog }) {
  const updateLog = useNutritionStore((s) => s.updateLog);
  const deleteLog = useNutritionStore((s) => s.deleteLog);

  const [quantity, setQuantity] = useState(String(log.quantity));
  const [mealType, setMealType] = useState<MealType>(log.mealType);
  const [quantityError, setQuantityError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const amount = parseNumber(quantity);
  const preview = amount === null ? null : rescale(log, amount);
  const changed = amount !== log.quantity || mealType !== log.mealType;

  async function handleSave() {
    if (amount === null || Number.isNaN(amount) || amount <= 0) {
      setQuantityError("Khối lượng phải lớn hơn 0");
      return;
    }
    setQuantityError(undefined);
    setFormError(null);
    setSaving(true);
    try {
      await updateLog(log.id, {
        ...(amount !== log.quantity && { quantity: amount }),
        ...(mealType !== log.mealType && { mealType }),
      });
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await deleteLog(log.id);
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
      setDeleting(false);
    }
  }

  function confirmDelete() {
    // Alert có nút chỉ chạy trên iOS/Android, web thì xoá luôn
    if (Platform.OS === "web") {
      remove();
      return;
    }
    Alert.alert("Xoá món này?", `${log.foodName} sẽ bị xoá khỏi nhật ký.`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: remove },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={styles.name}>{log.foodName}</Text>
        <Text style={styles.muted}>
          Đã ghi {formatServing(log.quantity, log.servingUnit)} · {log.calories} kcal
        </Text>
      </Card>

      <ErrorBanner message={formError} />

      <QuantityForm
        quantity={quantity}
        onQuantityChange={setQuantity}
        quantityError={quantityError}
        unit={log.servingUnit}
        mealType={mealType}
        onMealTypeChange={setMealType}
        preview={preview}
      />

      <Button title="Lưu thay đổi" onPress={handleSave} loading={saving} disabled={!changed} />
      <Button title="Xoá món" onPress={confirmDelete} loading={deleting} variant="danger" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
});
