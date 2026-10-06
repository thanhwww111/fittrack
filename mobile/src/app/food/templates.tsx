import { localeTag , translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { mealTemplateApi } from "@/api/nutritionApi";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { formatServing, isMealType, mealLabel } from "@/lib/nutrition";
import { useMeals } from "@/hooks/useMeals";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { MealTemplate, MealType } from "@/types/models";

const fmt = (n: number) => n.toLocaleString(localeTag(), { maximumFractionDigits: 0 });

// Bữa mẫu: lưu các món hay ăn cùng nhau (vd "Sáng đi làm") rồi thêm cả bữa bằng một lần bấm
export default function MealTemplatesScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const { meals, error: mealError } = useMeals();
  const mealType: MealType = isMealType(params.mealType)
    ? params.mealType
    : "BREAKFAST";
  const label = mealLabel(mealType, meals).toLowerCase();

  const store = useNutritionStore();
  const date = params.date ?? store.selectedDate ?? undefined;
  // Món đã ghi của bữa đang xem, để có thể lưu thành bữa mẫu
  const currentLogs =
    date && store.selectedDate === date ? store.logs.filter((l) => l.mealType === mealType) : [];

  const [templates, setTemplates] = useState<MealTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    mealTemplateApi
      .list()
      .then((list) => {
        setTemplates(list);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(load, [load]);

  async function saveCurrent() {
    if (!name.trim()) {
      setNameError(t("Đặt tên cho bữa mẫu, vd: Sáng đi làm"));
      return;
    }
    if (!date) return;
    setNameError(undefined);
    setSaving(true);
    try {
      const created = await mealTemplateApi.fromMeal({ name: name.trim(), date, mealType });
      setTemplates((prev) => [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function apply(template: MealTemplate) {
    setBusyId(template.id);
    setError(null);
    try {
      const res = await mealTemplateApi.apply(template.id, { mealType, date });
      await store.load(res.date);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setBusyId(null);
    }
  }

  async function remove(template: MealTemplate) {
    const ok = await confirmAction({
      title: t("Xoá bữa mẫu?"),
      message: t("\"{value1}\" sẽ bị xoá. Các món đã ghi trong nhật ký không bị ảnh hưởng.", { value1: template.name }),
      confirmText: t("Xoá"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await mealTemplateApi.remove(template.id);
      setTemplates((prev) => prev?.filter((t) => t.id !== template.id) ?? null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <ErrorBanner message={mealError} />

        {currentLogs.length > 0 ? (
          <Card title={t("Lưu {value1} này thành bữa mẫu", { value1: label })}>
            <Text style={styles.muted}>
              {currentLogs.map((l) => l.foodName).join(", ")}
            </Text>
            <TextField
              label={t("Tên bữa mẫu")}
              value={name}
              onChangeText={setName}
              error={nameError}
              placeholder={t("Ví dụ: Sáng đi làm")}
              maxLength={100}
            />
            <Button title={t("Lưu bữa mẫu")} variant="secondary" onPress={saveCurrent} loading={saving} />
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>{t("Thêm nhanh vào {value1}", { value1: label })}</Text>

        {templates === null ? (
          error ? null : <ActivityIndicator color={colors.primary} />
        ) : templates.length === 0 ? (
          <Text style={styles.empty}>{t("Chưa có bữa mẫu nào. Ghi các món của một bữa, rồi mở lại màn này để lưu thành bữa mẫu.")}</Text>
        ) : (
          templates.map((mealTemplate) => {
            const missing = mealTemplate.items.filter((i) => !i.available).length;
            return (
              <Card key={mealTemplate.id}>
                <View style={styles.header}>
                  <Text style={styles.name}>{mealTemplate.name}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Xoá bữa mẫu {value1}", { value1: mealTemplate.name })}
                    hitSlop={8}
                    onPress={() => remove(mealTemplate)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
                {mealTemplate.items.map((item, index) => (
                  <Text key={`${item.foodId}-${index}`} style={[styles.item, !item.available && styles.gone]}>
                    •{" "}
                    {item.available
                      ? `${item.foodName} · ${formatServing(item.quantity, item.servingUnit!)}`
                      : t("Món đã bị xoá (sẽ bỏ qua)")}
                  </Text>
                ))}
                <MacroChips values={mealTemplate.totals} />
                {missing > 0 ? (
                  <Text style={styles.muted}>{t("{value1} món không còn tồn tại sẽ không được thêm.", { value1: missing })}</Text>
                ) : null}
                <Button
                  title={t("Thêm vào {value1} · {value2} kcal", { value1: label, value2: fmt(mealTemplate.totals.calories) })}
                  onPress={() => apply(mealTemplate)}
                  loading={busyId === mealTemplate.id}
                  disabled={busyId !== null || missing === mealTemplate.items.length}
                />
              </Card>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  name: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text },
  item: { fontSize: 14, color: colors.text },
  gone: { color: colors.textMuted, fontStyle: "italic" },
  muted: { fontSize: 13, color: colors.textMuted },
  empty: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
}));
