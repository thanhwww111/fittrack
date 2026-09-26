import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { foodApi } from "@/api/foodApi";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { QuantityForm } from "@/components/nutrition/QuantityForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage, parseNumber } from "@/lib/formErrors";
import { formatServing, MEAL_ORDER, mealTypeForHour, previewNutrition } from "@/lib/nutrition";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { Food, MealType } from "@/types/models";

const MAX_QUANTITY = 10000;

function isMealType(value: string | undefined): value is MealType {
  return MEAL_ORDER.includes(value as MealType);
}

export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ foodId: string; mealType?: string; date?: string }>();
  const addLog = useNutritionStore((s) => s.addLog);

  const [food, setFood] = useState<Food | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [mealType, setMealType] = useState<MealType>(
    isMealType(params.mealType) ? params.mealType : mealTypeForHour(new Date().getHours())
  );
  const [quantityError, setQuantityError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [favorite, setFavorite] = useState(false);

  // Tải lại mỗi lần quay về màn này (vừa sửa món ở màn food/create)
  useFocusEffect(
    useCallback(() => {
      foodApi
        .get(params.foodId)
        .then((f) => {
          setFood(f);
          setQuantity((prev) => prev || String(f.servingSize));
        })
        .catch((err) => setLoadError(errorMessage(err)));
      foodApi
        .favorites()
        .then((list) => setFavorite(list.some((f) => f.id === params.foodId)))
        .catch(() => {});
    }, [params.foodId])
  );

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      await foodApi.setFavorite(params.foodId, next);
    } catch (err) {
      setFavorite(!next);
      setFormError(errorMessage(err));
    }
  }

  if (!food) {
    return (
      <View style={styles.center}>
        {loadError ? <ErrorBanner message={loadError} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const amount = parseNumber(quantity);
  const preview = amount === null ? null : previewNutrition(food, amount);

  async function handleAdd() {
    if (amount === null || Number.isNaN(amount) || amount <= 0) {
      setQuantityError("Khối lượng phải lớn hơn 0");
      return;
    }
    if (amount > MAX_QUANTITY) {
      setQuantityError(`Tối đa ${MAX_QUANTITY.toLocaleString("vi-VN")}`);
      return;
    }
    setQuantityError(undefined);
    setFormError(null);
    setSaving(true);
    try {
      await addLog({ foodId: food!.id, mealType, quantity: amount, date: params.date });
      // Quay thẳng về tab Dinh dưỡng, bỏ qua màn tìm kiếm
      router.dismissTo("/nutrition");
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Xoá món này?",
      message: `"${food!.name}" sẽ không còn trong danh sách tìm kiếm. Các lần đã ghi vẫn được giữ.`,
      confirmText: "Xoá",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setFormError(null);
    try {
      await foodApi.remove(food!.id);
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={styles.nameRow}>
          <Text style={[styles.name, styles.flex]}>{food.name}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
            accessibilityState={{ selected: favorite }}
            hitSlop={10}
            onPress={toggleFavorite}
          >
            <Ionicons name={favorite ? "star" : "star-outline"} size={24} color={colors.carbs} />
          </Pressable>
        </View>
        <Text style={styles.muted}>Mỗi {formatServing(food.servingSize, food.servingUnit)}</Text>
        <MacroChips values={food} />
        {food.fiber > 0 ? <Text style={styles.muted}>Chất xơ: {food.fiber} g</Text> : null}
      </Card>

      <ErrorBanner message={formError} />

      <QuantityForm
        quantity={quantity}
        onQuantityChange={setQuantity}
        quantityError={quantityError}
        unit={food.servingUnit}
        mealType={mealType}
        onMealTypeChange={setMealType}
        preview={preview}
      />

      <Button title="Thêm vào nhật ký" onPress={handleAdd} loading={saving} />

      {food.isCustom ? (
        <View style={styles.ownerActions}>
          <Button
            title="Sửa món"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push({ pathname: "/food/create", params: { id: food.id } })}
          />
          <Button
            title="Xoá món"
            variant="danger"
            style={styles.flex}
            loading={deleting}
            onPress={handleDelete}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  muted: { fontSize: 14, color: colors.textMuted },
  flex: { flex: 1 },
  ownerActions: { flexDirection: "row", gap: spacing.md },
}));
