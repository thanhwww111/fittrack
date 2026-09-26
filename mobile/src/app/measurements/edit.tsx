import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { measurementApi, type MeasurementInput } from "@/api/progressApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { localToday } from "@/hooks/useProgress";
import { confirmAction } from "@/lib/confirm";
import { errorMessage, fieldErrorsFrom, parseNumber, type FieldErrors } from "@/lib/formErrors";
import { MEASUREMENT_FIELDS, type MeasurementField } from "@/lib/measurements";
import { addDays, formatDayLabel } from "@/lib/nutrition";
import { promptTargetRecalculation } from "@/lib/targetRecalculation";
import type { BodyMeasurement } from "@/types/models";

interface Loaded {
  date: string;
  measurement: BodyMeasurement | null;
}

// Ghi / sửa số đo của một ngày. Đổi ngày bằng ← → để sửa lần đo cũ hoặc ghi bù.
export default function EditMeasurementScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const today = localToday();
  const [date, setDate] = useState(params.date && params.date <= today ? params.date : today);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    measurementApi
      .list({ from: date, to: date })
      .then((items) => {
        if (!cancelled) {
          setLoaded({ date, measurement: items[0] ?? null });
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const isToday = date === today;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.dateBar}>
          <Pressable accessibilityLabel="Ngày trước" hitSlop={12} onPress={() => setDate(addDays(date, -1))}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.dateText}>{formatDayLabel(date, today)}</Text>
          <Pressable
            accessibilityLabel="Ngày sau"
            hitSlop={12}
            disabled={isToday}
            onPress={() => setDate(addDays(date, 1))}
          >
            <Ionicons name="chevron-forward" size={24} color={isToday ? colors.border : colors.primary} />
          </Pressable>
        </View>

        <ErrorBanner message={loadError} />

        {loaded?.date === date ? (
          <MeasurementForm key={`${date}-${loaded.measurement?.id ?? "new"}`} date={date} measurement={loaded.measurement} />
        ) : loadError ? null : (
          <ActivityIndicator color={colors.primary} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const toText = (value: number | null | undefined) => (value == null ? "" : String(value));

function MeasurementForm({ date, measurement }: { date: string; measurement: BodyMeasurement | null }) {
  const [values, setValues] = useState<Record<MeasurementField, string>>(() => ({
    weight: toText(measurement?.weight),
    bodyFat: toText(measurement?.bodyFat),
    chest: toText(measurement?.chest),
    waist: toText(measurement?.waist),
    arm: toText(measurement?.arm),
    thigh: toText(measurement?.thigh),
  }));
  const [errors, setErrors] = useState<FieldErrors<MeasurementField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    const nextErrors: FieldErrors<MeasurementField> = {};
    const input: Partial<Record<MeasurementField, number>> = {};

    for (const field of MEASUREMENT_FIELDS) {
      const value = parseNumber(values[field.key]);
      if (value === null) {
        if (field.required) nextErrors[field.key] = "Bắt buộc";
      } else if (Number.isNaN(value) || value < field.min || value > field.max) {
        nextErrors[field.key] = `Nhập từ ${field.min} đến ${field.max}`;
      } else {
        input[field.key] = value;
      }
    }

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await measurementApi.save({ ...(input as MeasurementInput), date });
      await promptTargetRecalculation();
      router.back();
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Xoá lần đo này?",
      message: "Cân nặng và các số đo của ngày này sẽ bị xoá.",
      confirmText: "Xoá",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await measurementApi.remove(measurement!.id);
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <>
      <ErrorBanner message={formError} />
      <Card>
        {MEASUREMENT_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.required ? field.label : `${field.label} (không bắt buộc)`}
            suffix={field.unit}
            value={values[field.key]}
            onChangeText={(text) => setValues((prev) => ({ ...prev, [field.key]: text }))}
            error={errors[field.key]}
            keyboardType="decimal-pad"
          />
        ))}
        <Text style={styles.hint}>Đo vòng eo ngang rốn, đo vào buổi sáng trước khi ăn để số ổn định.</Text>
      </Card>
      <Button title={measurement ? "Lưu thay đổi" : "Lưu số đo"} onPress={handleSave} loading={saving} />
      {measurement ? (
        <Button title="Xoá lần đo" variant="danger" onPress={handleDelete} loading={deleting} />
      ) : null}
    </>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  dateText: { fontSize: 17, fontWeight: "600", color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
}));
