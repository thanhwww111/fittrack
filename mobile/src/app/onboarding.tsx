import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { goalApi } from "@/api/profileApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { GradientView } from "@/components/ui/GradientView";
import { TextField } from "@/components/ui/TextField";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage, type FieldErrors } from "@/lib/formErrors";
import {
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  NUMBER_FIELDS,
  parseProfileNumbers,
  type NumberField,
} from "@/lib/profileForm";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import type { ActivityLevel, Gender, GoalType, Macros, UpdateProfileInput } from "@/types/models";

const STEPS = ["Cơ thể", "Mục tiêu", "Kết quả"];
const BODY_FIELDS = ["age", "height", "currentWeight"] as const;

type Field = NumberField | "gender" | "goalType" | "activityLevel";

const toText = (value: number | null | undefined) => (value == null ? "" : String(value));

// Thiết lập lần đầu (bắt buộc): chỉ số cơ thể → mục tiêu → FitTrack tự tính calo & macro.
// Root layout chỉ cho vào app khi hồ sơ đủ các trường server cần để tính mục tiêu.
export default function OnboardingScreen() {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const recalculateTarget = useProfileStore((s) => s.recalculateTarget);
  const setOnboardingActive = useProfileStore((s) => s.setOnboardingActive);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [goalType, setGoalType] = useState<GoalType | null>(profile?.goalType ?? null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile?.activityLevel ?? null);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({
    age: toText(profile?.age),
    height: toText(profile?.height),
    currentWeight: toText(profile?.currentWeight),
    goalWeight: toText(profile?.goalWeight),
    goalRate: toText(profile?.goalRate),
    trainingDaysPerWeek: toText(profile?.trainingDaysPerWeek),
  });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Macros | null>(null);
  const [busy, setBusy] = useState(false);

  // Lưu hồ sơ ở bước 2 làm hồ sơ "đủ": cờ này giữ user ở đây để xem kết quả trước khi vào app
  useEffect(() => {
    setOnboardingActive(true);
  }, [setOnboardingActive]);

  const setNumber = (key: NumberField) => (text: string) =>
    setNumbers((prev) => ({ ...prev, [key]: text }));

  function nextFromBody() {
    const { errors: nextErrors } = parseProfileNumbers(numbers, BODY_FIELDS, BODY_FIELDS);
    const all: FieldErrors<Field> = { ...nextErrors };
    if (!gender) all.gender = "Chọn giới tính";
    setErrors(all);
    if (Object.keys(all).length === 0) setStep(1);
  }

  async function saveGoal() {
    const goalFields: NumberField[] =
      goalType === "MAINTENANCE"
        ? ["trainingDaysPerWeek"]
        : ["goalWeight", "goalRate", "trainingDaysPerWeek"];
    const parsed = parseProfileNumbers(numbers, [...BODY_FIELDS, ...goalFields], BODY_FIELDS);
    const all: FieldErrors<Field> = { ...parsed.errors };
    if (!goalType) all.goalType = "Chọn mục tiêu";
    if (!activityLevel) all.activityLevel = "Chọn mức vận động";
    // Cùng quy tắc với server (profile.service): cân mục tiêu phải đúng chiều với mục tiêu
    const { goalWeight, currentWeight } = parsed.input;
    if (goalWeight != null && currentWeight != null) {
      if (goalType === "WEIGHT_LOSS" && goalWeight >= currentWeight) {
        all.goalWeight = "Giảm cân thì cân mục tiêu phải nhỏ hơn cân hiện tại";
      }
      if (goalType === "MUSCLE_GAIN" && goalWeight <= currentWeight) {
        all.goalWeight = "Tăng cơ thì cân mục tiêu phải lớn hơn cân hiện tại";
      }
    }
    setErrors(all);
    setFormError(null);
    if (Object.keys(all).length > 0) return;

    const input: UpdateProfileInput = { ...parsed.input, gender: gender!, goalType: goalType!, activityLevel: activityLevel! };
    setBusy(true);
    try {
      await updateProfile(input);
      setSuggestion(await goalApi.suggestion());
      setStep(2);
    } catch (err) {
      // Ví dụ: tăng cơ nhưng cân mục tiêu thấp hơn cân hiện tại
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setFormError(null);
    try {
      await recalculateTarget();
      // Tắt cờ → root layout mở các tab
      setOnboardingActive(false);
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.kicker}>Bước {step + 1}/3 · {STEPS[step]}</Text>
            <Text style={styles.title}>
              {step === 0
                ? `Chào ${user?.name ?? "bạn"} 👋`
                : step === 1
                  ? "Mục tiêu của bạn"
                  : "Mục tiêu mỗi ngày"}
            </Text>
            <Text style={styles.subtitle}>
              {step === 0
                ? "Cho FitTrack biết chỉ số cơ thể để tính lượng calo và protein phù hợp với bạn."
                : step === 1
                  ? "Chọn mục tiêu và mức vận động, FitTrack sẽ tự tính phần còn lại."
                  : "FitTrack đã tính sẵn cho bạn. Bạn có thể đổi bất cứ lúc nào ở tab Cá nhân."}
            </Text>
            <View style={styles.progress}>
              {STEPS.map((label, i) => (
                <View key={label} style={[styles.progressDot, i <= step && styles.progressDone]} />
              ))}
            </View>
          </View>

          <ErrorBanner message={formError} />

          {step === 0 ? (
            <Card title="Chỉ số cơ thể" icon="body">
              <ChipGroup label="Giới tính" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
              {errors.gender ? <Text style={styles.error}>{errors.gender}</Text> : null}
              {BODY_FIELDS.map((key) => (
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
              <Button title="Tiếp tục" onPress={nextFromBody} />
            </Card>
          ) : null}

          {step === 1 ? (
            <Card title="Mục tiêu" icon="flag">
              <ChipGroup label="Bạn muốn" options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
              {errors.goalType ? <Text style={styles.error}>{errors.goalType}</Text> : null}
              <ChipGroup
                label="Mức độ vận động"
                options={ACTIVITY_OPTIONS}
                value={activityLevel}
                onChange={setActivityLevel}
              />
              {errors.activityLevel ? <Text style={styles.error}>{errors.activityLevel}</Text> : null}
              {(goalType === "MAINTENANCE"
                ? (["trainingDaysPerWeek"] as const)
                : (["goalWeight", "goalRate", "trainingDaysPerWeek"] as const)
              ).map((key) => (
                <TextField
                  key={key}
                  label={`${NUMBER_FIELDS[key].label}${key === "goalRate" ? "" : " (không bắt buộc)"}`}
                  suffix={NUMBER_FIELDS[key].suffix}
                  value={numbers[key]}
                  onChangeText={setNumber(key)}
                  error={errors[key]}
                  keyboardType={NUMBER_FIELDS[key].integer ? "number-pad" : "decimal-pad"}
                />
              ))}
              <View style={styles.row}>
                <Button title="Quay lại" variant="secondary" onPress={() => setStep(0)} style={styles.flex} />
                <Button title="Tính cho tôi" onPress={saveGoal} loading={busy} style={styles.flex} />
              </View>
            </Card>
          ) : null}

          {step === 2 && suggestion ? (
            <>
              <GradientView style={styles.result}>
                <Text style={styles.resultLabel}>Calo mỗi ngày</Text>
                <Text style={styles.resultValue}>{suggestion.calories.toLocaleString("vi-VN")} kcal</Text>
                <View style={styles.macros}>
                  <MacroPill label="Protein" value={suggestion.protein} />
                  <MacroPill label="Carbs" value={suggestion.carbs} />
                  <MacroPill label="Fat" value={suggestion.fat} />
                </View>
              </GradientView>
              <Text style={styles.subtitle}>
                Tính theo công thức Mifflin-St Jeor từ chiều cao, cân nặng, tuổi và mức vận động,
                {goalType === "WEIGHT_LOSS"
                  ? " trừ bớt calo để giảm cân"
                  : goalType === "MUSCLE_GAIN"
                    ? " cộng thêm calo để tăng cơ"
                    : " giữ nguyên để duy trì cân nặng"}
                {numbers.goalRate.trim() ? " theo tốc độ bạn chọn" : ""}. Protein tính theo cân nặng.
              </Text>
              <Button title="Bắt đầu dùng FitTrack" onPress={finish} loading={busy} />
              <Button title="Sửa mục tiêu" variant="secondary" onPress={() => setStep(1)} />
            </>
          ) : null}

          <Button title="Đăng xuất" variant="secondary" onPress={logout} style={styles.logout} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value} g</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  progress: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  progressDot: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  progressDone: { backgroundColor: colors.primary },
  error: { fontSize: 13, color: colors.danger },
  row: { flexDirection: "row", gap: spacing.md },
  result: { padding: spacing.xl, gap: spacing.xs },
  resultLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onGradientMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultValue: { fontSize: 36, fontWeight: "800", color: colors.onGradient, letterSpacing: -0.5 },
  macros: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.onGradientTrack,
  },
  pillValue: { fontSize: 18, fontWeight: "800", color: colors.onGradient },
  pillLabel: { fontSize: 12, fontWeight: "700", color: colors.onGradientMuted },
  logout: { marginTop: spacing.md },
}));
