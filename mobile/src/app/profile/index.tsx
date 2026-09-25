import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing } from "@/constants/theme";
import { errorMessage, fieldErrorsFrom, parseNumber, type FieldErrors } from "@/lib/formErrors";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import type {
  ActivityLevel,
  Gender,
  GoalType,
  UpdateProfileInput,
  UserProfile,
} from "@/types/models";

const GENDER_OPTIONS: ChipOption<Gender>[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

const GOAL_OPTIONS: ChipOption<GoalType>[] = [
  { value: "WEIGHT_LOSS", label: "Giảm cân" },
  { value: "MAINTENANCE", label: "Giữ cân" },
  { value: "MUSCLE_GAIN", label: "Tăng cơ" },
];

const ACTIVITY_OPTIONS: ChipOption<ActivityLevel>[] = [
  { value: "SEDENTARY", label: "Ít vận động" },
  { value: "LIGHT", label: "Nhẹ (1–3 buổi)" },
  { value: "MODERATE", label: "Vừa (3–5 buổi)" },
  { value: "ACTIVE", label: "Nhiều (6–7 buổi)" },
  { value: "VERY_ACTIVE", label: "Rất nhiều" },
];

// Khớp với giới hạn ở server (schemas/profile.schema.ts)
const NUMBER_FIELDS = {
  age: { label: "Tuổi", min: 10, max: 120, integer: true, suffix: "tuổi" },
  height: { label: "Chiều cao", min: 50, max: 300, integer: false, suffix: "cm" },
  currentWeight: { label: "Cân nặng hiện tại", min: 20, max: 500, integer: false, suffix: "kg" },
  goalWeight: { label: "Cân nặng mục tiêu", min: 20, max: 500, integer: false, suffix: "kg" },
  trainingDaysPerWeek: { label: "Số buổi tập / tuần", min: 0, max: 7, integer: true, suffix: "buổi" },
} as const;

type NumberField = keyof typeof NUMBER_FIELDS;
type Field = NumberField | "gender" | "goalType" | "activityLevel";

const toText = (value: number | null) => (value == null ? "" : String(value));

export default function ProfileScreen() {
  const profile = useProfileStore((s) => s.profile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const loadError = useProfileStore((s) => s.error);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!profile) {
    return (
      <View style={styles.center}>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : <ErrorBanner message={loadError} />}
      </View>
    );
  }

  // key = id: form khởi tạo lại state khi profile được tải xong
  return <ProfileForm key={profile.id} profile={profile} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const recalculateTarget = useProfileStore((s) => s.recalculateTarget);
  const currentTarget = useProfileStore((s) => s.currentTarget);

  const [gender, setGender] = useState(profile.gender);
  const [goalType, setGoalType] = useState(profile.goalType);
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({
    age: toText(profile.age),
    height: toText(profile.height),
    currentWeight: toText(profile.currentWeight),
    goalWeight: toText(profile.goalWeight),
    trainingDaysPerWeek: toText(profile.trainingDaysPerWeek),
  });

  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  function buildInput(): { input: UpdateProfileInput; errors: FieldErrors<Field> } {
    const input: UpdateProfileInput = {};
    const nextErrors: FieldErrors<Field> = {};

    for (const key of Object.keys(NUMBER_FIELDS) as NumberField[]) {
      const rule = NUMBER_FIELDS[key];
      const value = parseNumber(numbers[key]);
      if (value === null) continue;
      if (Number.isNaN(value) || value < rule.min || value > rule.max) {
        nextErrors[key] = `Nhập từ ${rule.min} đến ${rule.max}`;
      } else if (rule.integer && !Number.isInteger(value)) {
        nextErrors[key] = "Phải là số nguyên";
      } else {
        input[key] = value;
      }
    }

    if (gender) input.gender = gender;
    if (goalType) input.goalType = goalType;
    if (activityLevel) input.activityLevel = activityLevel;

    return { input, errors: nextErrors };
  }

  async function handleSave() {
    const { input, errors: nextErrors } = buildInput();
    setErrors(nextErrors);
    setFormError(null);
    setNotice(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (Object.keys(input).length === 0) {
      setFormError("Bạn chưa nhập thông tin nào.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(input);
      setNotice("Đã lưu hồ sơ.");
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRecalculate() {
    setFormError(null);
    setNotice(null);
    setCalculating(true);
    try {
      await recalculateTarget();
      setNotice("Đã cập nhật mục tiêu dinh dưỡng.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setCalculating(false);
    }
  }

  const setNumber = (key: NumberField) => (text: string) =>
    setNumbers((prev) => ({ ...prev, [key]: text }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <ErrorBanner message={formError} />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Card title="Thông tin cơ thể">
          <ChipGroup label="Giới tính" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
          {(["age", "height", "currentWeight"] as const).map((key) => (
            <TextField
              key={key}
              label={NUMBER_FIELDS[key].label}
              suffix={NUMBER_FIELDS[key].suffix}
              value={numbers[key]}
              onChangeText={setNumber(key)}
              error={errors[key]}
              keyboardType="decimal-pad"
            />
          ))}
        </Card>

        <Card title="Mục tiêu">
          <ChipGroup label="Mục tiêu" options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
          {errors.goalType ? <Text style={styles.error}>{errors.goalType}</Text> : null}
          <ChipGroup
            label="Mức độ vận động"
            options={ACTIVITY_OPTIONS}
            value={activityLevel}
            onChange={setActivityLevel}
          />
          {(["goalWeight", "trainingDaysPerWeek"] as const).map((key) => (
            <TextField
              key={key}
              label={NUMBER_FIELDS[key].label}
              suffix={NUMBER_FIELDS[key].suffix}
              value={numbers[key]}
              onChangeText={setNumber(key)}
              error={errors[key]}
              keyboardType={NUMBER_FIELDS[key].integer ? "number-pad" : "decimal-pad"}
            />
          ))}
        </Card>

        <Button title="Lưu hồ sơ" onPress={handleSave} loading={saving} />

        <Card title="Mục tiêu dinh dưỡng mỗi ngày">
          {currentTarget ? (
            <View style={styles.targetRow}>
              <Macro label="Calo" value={currentTarget.calories} unit="kcal" />
              <Macro label="Protein" value={currentTarget.protein} unit="g" />
              <Macro label="Carbs" value={currentTarget.carbs} unit="g" />
              <Macro label="Fat" value={currentTarget.fat} unit="g" />
            </View>
          ) : (
            <Text style={styles.muted}>Chưa có mục tiêu. Lưu hồ sơ đầy đủ rồi bấm tính tự động.</Text>
          )}
          <Button
            title={currentTarget ? "Tính lại từ hồ sơ" : "Tính tự động từ hồ sơ"}
            onPress={handleRecalculate}
            loading={calculating}
            variant="secondary"
          />
        </Card>

        <Button title="Đăng xuất" onPress={logout} variant="danger" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>
        {label} ({unit})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  email: { fontSize: 15, color: colors.textMuted },
  notice: { fontSize: 14, color: colors.success },
  error: { fontSize: 13, color: colors.danger },
  muted: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  targetRow: { flexDirection: "row", gap: spacing.sm },
  macro: { flex: 1, gap: 2 },
  macroValue: { fontSize: 18, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  macroLabel: { fontSize: 12, color: colors.textMuted },
});
