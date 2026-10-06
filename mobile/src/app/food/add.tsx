import { personalPlanApi } from "@/api/personalPlanApi";
import { usePersonalPlanStore } from "@/stores/personalPlanStore";
import { foodVersion } from "@/lib/personalPlan";
import { localeTag , translate as t, useTranslation } from "@/i18n";
import { useDraftState, clearFormDrafts } from "@/hooks/useDraftState";
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
import { formatServing, isMealType, mealTypeForHour, previewNutrition } from "@/lib/nutrition";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { Food, MealType } from "@/types/models";

const MAX_QUANTITY = 10000;

export default function AddFoodScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const params = useLocalSearchParams<{ foodId: string; mealType?: string; date?: string; quantity?: string; planId?: string; planItemId?: string }>();
  const addLog = useNutritionStore((s) => s.addLog);

  const [food, setFood] = useState<Food | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const draftKey = `add-${params.planId ?? "regular"}-${params.planItemId ?? "item"}-${params.foodId}-${params.date ?? "today"}-${params.mealType ?? "default"}`;
  const [quantity, setQuantity] = useDraftState(draftKey + "quantity", params.planId && params.quantity ? params.quantity : "");
  const [mealType, setMealType] = useDraftState<MealType>(draftKey + "mealType",
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
    }, [params.foodId, setQuantity])
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
      setQuantityError(t("Khối lượng phải lớn hơn 0"));
      return;
    }
    if (amount > MAX_QUANTITY) {
      setQuantityError(t("Tối đa {value1}", { value1: MAX_QUANTITY.toLocaleString(localeTag()) }));
      return;
    }
    setQuantityError(undefined);
    setFormError(null);
    setSaving(true);
    try {
      if (params.planId && params.planItemId) {
        const log = await personalPlanApi.logItem(params.planId, params.planItemId, { mealType, quantity: amount, foodVersion: foodVersion(food!) });
        await useNutritionStore.getState().load(log.date);
        await usePersonalPlanStore.getState().load();
      } else {
        await addLog({ foodId: food!.id, mealType, quantity: amount, date: params.date });
      }
      // Quay thẳng về tab Dinh dưỡng, bỏ qua màn tìm kiếm
      clearFormDrafts(draftKey);
      router.dismissTo("/nutrition");
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: t("Xoá món này?"),
      message: t("\"{value1}\" sẽ không còn trong danh sách tìm kiếm. Các lần đã ghi vẫn được giữ.", { value1: food!.name }),
      confirmText: t("Xoá"),
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
            accessibilityLabel={favorite ? t("Bỏ khỏi yêu thích") : t("Thêm vào yêu thích")}
            accessibilityState={{ selected: favorite }}
            hitSlop={10}
            onPress={toggleFavorite}
          >
            <Ionicons name={favorite ? "star" : "star-outline"} size={24} color={colors.carbs} />
          </Pressable>
        </View>
        <Text style={styles.muted}>{t("Mỗi {value1}", { value1: formatServing(food.servingSize, food.servingUnit) })}</Text>
        <MacroChips values={food} />
        {food.fiber > 0 ? <Text style={styles.muted}>{t("Chất xơ: {value1} g", { value1: food.fiber })}</Text> : null}
      </Card>

      <ErrorBanner message={formError} />
      {params.planId && formError ? <Button title={t("Tải lại món")} variant="secondary" loading={saving} onPress={async () => {
        setSaving(true);
        try { setFood(await foodApi.get(params.foodId)); setFormError(null); }
        catch (e) { setFormError(errorMessage(e)); }
        finally { setSaving(false); }
      }} /> : null}

      <QuantityForm
        quantity={quantity}
        onQuantityChange={setQuantity}
        quantityError={quantityError}
        unit={food.servingUnit}
        mealType={mealType}
        onMealTypeChange={setMealType}
        preview={preview}
      />

      <Button title={t("Thêm vào nhật ký")} onPress={handleAdd} loading={saving} />

      {food.isCustom ? (
        <View style={styles.ownerActions}>
          <Button
            title={t("Sửa món")}
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push({ pathname: "/food/create", params: { id: food.id } })}
          />
          <Button
            title={t("Xoá món")}
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
