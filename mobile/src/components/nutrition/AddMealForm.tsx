import { translate as t, useTranslation } from "@/i18n";
import { useState } from "react";
import { View } from "react-native";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { useMealStore } from "@/stores/mealStore";
import type { MealType } from "@/types/models";

export function AddMealForm({ onAdded }: { onAdded: (id: MealType) => void }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) { setError(t("Nhập tên bữa ăn.")); return; }
    if (clean.length > 40) { setError(t("Tên bữa tối đa 40 ký tự.")); return; }
    setSaving(true);
    setError(undefined);
    try {
      const meal = await useMealStore.getState().add(clean);
      onAdded(meal.id);
      setName("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t("Tên bữa này đã có. Hãy chọn bữa hiện có hoặc đặt tên khác.") : errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <Button title={t("+ Thêm bữa tùy chọn")} variant="secondary" onPress={() => setOpen(true)} />;
  return <View style={styles.form}>
    <TextField label={t("Tên bữa mới")} value={name} onChangeText={setName} maxLength={40}
      placeholder={t("Ví dụ: Trước tập, Sau tập")} error={error} editable={!saving} />
    <Button title={t("Lưu bữa")} onPress={save} loading={saving} />
    <Button title={t("Hủy")} variant="secondary" disabled={saving} onPress={() => { setOpen(false); setError(undefined); }} />
  </View>;
}

const styles = themedStyles(() => ({ form: { gap: spacing.sm } }));
