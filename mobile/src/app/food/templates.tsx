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
import { formatServing, MEAL_LABELS, MEAL_ORDER } from "@/lib/nutrition";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { MealTemplate, MealType } from "@/types/models";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

// Bữa mẫu: lưu các món hay ăn cùng nhau (vd "Sáng đi làm") rồi thêm cả bữa bằng một lần bấm
export default function MealTemplatesScreen() {
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const mealType: MealType = MEAL_ORDER.includes(params.mealType as MealType)
    ? (params.mealType as MealType)
    : "BREAKFAST";
  const mealLabel = MEAL_LABELS[mealType].toLowerCase();

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
      setNameError("Đặt tên cho bữa mẫu, vd: Sáng đi làm");
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
      title: "Xoá bữa mẫu?",
      message: `"${template.name}" sẽ bị xoá. Các món đã ghi trong nhật ký không bị ảnh hưởng.`,
      confirmText: "Xoá",
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

        {currentLogs.length > 0 ? (
          <Card title={`Lưu ${mealLabel} này thành bữa mẫu`}>
            <Text style={styles.muted}>
              {currentLogs.map((l) => l.foodName).join(", ")}
            </Text>
            <TextField
              label="Tên bữa mẫu"
              value={name}
              onChangeText={setName}
              error={nameError}
              placeholder="Ví dụ: Sáng đi làm"
              maxLength={100}
            />
            <Button title="Lưu bữa mẫu" variant="secondary" onPress={saveCurrent} loading={saving} />
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Thêm nhanh vào {mealLabel}</Text>

        {templates === null ? (
          error ? null : <ActivityIndicator color={colors.primary} />
        ) : templates.length === 0 ? (
          <Text style={styles.empty}>
            Chưa có bữa mẫu nào. Ghi các món của một bữa, rồi mở lại màn này để lưu thành bữa mẫu.
          </Text>
        ) : (
          templates.map((t) => {
            const missing = t.items.filter((i) => !i.available).length;
            return (
              <Card key={t.id}>
                <View style={styles.header}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xoá bữa mẫu ${t.name}`}
                    hitSlop={8}
                    onPress={() => remove(t)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
                {t.items.map((item, index) => (
                  <Text key={`${item.foodId}-${index}`} style={[styles.item, !item.available && styles.gone]}>
                    •{" "}
                    {item.available
                      ? `${item.foodName} · ${formatServing(item.quantity, item.servingUnit!)}`
                      : "Món đã bị xoá (sẽ bỏ qua)"}
                  </Text>
                ))}
                <MacroChips values={t.totals} />
                {missing > 0 ? (
                  <Text style={styles.muted}>{missing} món không còn tồn tại sẽ không được thêm.</Text>
                ) : null}
                <Button
                  title={`Thêm vào ${mealLabel} · ${fmt(t.totals.calories)} kcal`}
                  onPress={() => apply(t)}
                  loading={busyId === t.id}
                  disabled={busyId !== null || missing === t.items.length}
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
