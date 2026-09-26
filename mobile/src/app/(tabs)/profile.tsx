import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ManualTargetForm } from "@/components/profile/ManualTargetForm";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { errorMessage, fieldErrorsFrom, type FieldErrors } from "@/lib/formErrors";
import {
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  NUMBER_FIELDS,
  parseProfileNumbers,
  type NumberField,
} from "@/lib/profileForm";
import { promptTargetRecalculation } from "@/lib/targetRecalculation";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useProfileStore } from "@/stores/profileStore";
import type { UpdateProfileInput, UserProfile } from "@/types/models";

type Field = NumberField | "gender" | "goalType" | "activityLevel";

const toText = (value: number | null) => (value == null ? "" : String(value));

export default function ProfileScreen() {
  const profile = useProfileStore((s) => s.profile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const loadError = useProfileStore((s) => s.error);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  // Là tab nên màn hình không dựng lại: tải lại mỗi lần quay về để thấy cân nặng vừa ghi ở tab khác
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  if (!profile) {
    return (
      <View style={styles.center}>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : <ErrorBanner message={loadError} />}
      </View>
    );
  }

  // key đổi khi dữ liệu trên server đổi: form nạp lại số mới, tránh lưu đè cân nặng cũ
  return <ProfileForm key={`${profile.id}-${profile.updatedAt}`} profile={profile} />;
}

function ProfileForm({ profile }: { profile: UserProfile }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const recalculateTarget = useProfileStore((s) => s.recalculateTarget);
  const currentTarget = useProfileStore((s) => s.currentTarget);
  const setManualTarget = useProfileStore((s) => s.setManualTarget);
  const [editingTarget, setEditingTarget] = useState(false);

  const [gender, setGender] = useState(profile.gender);
  const [goalType, setGoalType] = useState(profile.goalType);
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({
    age: toText(profile.age),
    height: toText(profile.height),
    currentWeight: toText(profile.currentWeight),
    goalWeight: toText(profile.goalWeight),
    trainingDaysPerWeek: toText(profile.trainingDaysPerWeek),
    goalRate: toText(profile.goalRate),
  });

  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  function buildInput(): { input: UpdateProfileInput; errors: FieldErrors<Field> } {
    const parsed = parseProfileNumbers(numbers, Object.keys(NUMBER_FIELDS) as NumberField[]);
    const input: UpdateProfileInput = parsed.input;
    const nextErrors: FieldErrors<Field> = parsed.errors;

    // Xoá trắng ô tốc độ = quay về mức mặc định theo mục tiêu
    if (numbers.goalRate.trim() === "" && profile.goalRate != null) input.goalRate = null;

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
      const updated = await promptTargetRecalculation();
      setNotice(updated ? "Đã lưu hồ sơ và cập nhật mục tiêu dinh dưỡng." : "Đã lưu hồ sơ.");
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tài khoản & bảo mật"
          onPress={() => router.push("/settings/account")}
          style={styles.userRow}
        >
          <Avatar name={user?.name} uri={user?.avatar} size={56} />
          <View style={styles.flex}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </Pressable>

        <ErrorBanner message={formError} />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Card title="Thông tin cơ thể" icon="body">
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

        <Card title="Mục tiêu" icon="flag">
          <ChipGroup label="Mục tiêu" options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
          {errors.goalType ? <Text style={styles.error}>{errors.goalType}</Text> : null}
          <ChipGroup
            label="Mức độ vận động"
            options={ACTIVITY_OPTIONS}
            value={activityLevel}
            onChange={setActivityLevel}
          />
          {(goalType === "MAINTENANCE"
            ? (["goalWeight", "trainingDaysPerWeek"] as const)
            : (["goalWeight", "goalRate", "trainingDaysPerWeek"] as const)
          ).map((key) => (
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

        <Card title="Mục tiêu dinh dưỡng mỗi ngày" icon="nutrition">
          {editingTarget ? (
            <ManualTargetForm
              initial={currentTarget}
              onCancel={() => setEditingTarget(false)}
              onSubmit={async (macros) => {
                await setManualTarget(macros);
                setEditingTarget(false);
                setNotice("Đã lưu mục tiêu dinh dưỡng bạn tự nhập.");
              }}
            />
          ) : (
            <>
              {currentTarget ? (
                <>
                  <View style={styles.targetRow}>
                    <Macro label="Calo" value={currentTarget.calories} unit="kcal" />
                    <Macro label="Protein" value={currentTarget.protein} unit="g" />
                    <Macro label="Carbs" value={currentTarget.carbs} unit="g" />
                    <Macro label="Fat" value={currentTarget.fat} unit="g" />
                  </View>
                  <Text style={styles.source}>
                    {currentTarget.source === "MANUAL" ? "Bạn tự nhập" : "Tự tính từ hồ sơ"}
                  </Text>
                </>
              ) : (
                <Text style={styles.muted}>
                  Chưa có mục tiêu. Lưu hồ sơ đầy đủ rồi bấm tính tự động, hoặc tự nhập số của bạn.
                </Text>
              )}
              <View style={styles.targetActions}>
                <Button
                  title={currentTarget ? "Tính lại từ hồ sơ" : "Tính tự động"}
                  onPress={handleRecalculate}
                  loading={calculating}
                  variant="secondary"
                  style={styles.flex}
                />
                <Button
                  title="Tự nhập"
                  onPress={() => {
                    setNotice(null);
                    setEditingTarget(true);
                  }}
                  variant="secondary"
                  style={styles.flex}
                />
              </View>
            </>
          )}
        </Card>

        <Button
          title="👤 Tài khoản & bảo mật"
          variant="secondary"
          onPress={() => router.push("/settings/account")}
        />
        <Button
          title="🔔 Cài đặt thông báo"
          variant="secondary"
          onPress={() => router.push("/settings/notifications")}
        />
        <Button
          title="Đăng xuất"
          onPress={async () => {
            // Gỡ máy khỏi danh sách nhận push trước, lúc còn access token
            await useNotificationStore.getState().unregisterDevice();
            await logout();
          }}
          variant="danger"
        />
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

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  userRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  email: { fontSize: 15, color: colors.textMuted },
  notice: { fontSize: 14, color: colors.success },
  error: { fontSize: 13, color: colors.danger },
  muted: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  targetRow: { flexDirection: "row", gap: spacing.sm },
  targetActions: { flexDirection: "row", gap: spacing.md },
  source: { fontSize: 13, color: colors.textMuted },
  macro: { flex: 1, gap: 2 },
  macroValue: { fontSize: 18, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  macroLabel: { fontSize: 12, color: colors.textMuted },
}));
