import { translate as t, useTranslation } from "@/i18n";
import { useDraftState, clearFormDrafts } from "@/hooks/useDraftState";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { ensurePermission } from "@/lib/notifications";
import { MAX_MEAL_REMINDERS, nextFreeReminderTime, validateMealReminders } from "@/lib/nutritionReminders";
import { useNotificationStore } from "@/stores/notificationStore";
import type { MealReminder, NotificationSettings } from "@/types/models";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const PUSH_NOTES: Record<string, string> = {
  get "expo-go"() { return t("Bạn đang dùng Expo Go: lịch nhắc vẫn hoạt động, nhưng thông báo từ server (PR, mục tiêu, báo cáo tuần) cần bản build của app."); },
  get simulator() { return t("Máy ảo không nhận được thông báo từ server, hãy thử trên điện thoại thật."); },
  get "no-project"() { return t("App chưa được liên kết với EAS (thiếu projectId) nên chưa nhận được thông báo từ server."); },
  get denied() { return t("Bạn đã tắt quyền thông báo. Bật lại trong Cài đặt của điện thoại để nhận thông báo."); },
  get error() { return t("Không đăng ký được thông báo từ server, thử mở lại app sau."); },
};

export default function NotificationSettingsScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const settings = useNotificationStore((s) => s.settings);
  const syncError = useNotificationStore((s) => s.error);

  useEffect(() => {
    if (!useNotificationStore.getState().settings) {
      useNotificationStore.getState().syncOnLogin();
    }
  }, []);

  if (!settings) {
    return (
      <View style={styles.center}>
        {syncError ? <ErrorBanner message={syncError} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return <SettingsForm key={JSON.stringify(settings)} settings={settings} />;
}

function SettingsForm({ settings }: { settings: NotificationSettings }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const update = useNotificationStore((s) => s.update);
  const push = useNotificationStore((s) => s.push);

  const draftKey = `notifications`;
  const [draft, setDraft] = useDraftState(draftKey + "draft", settings);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setWorkout = (patch: Partial<NotificationSettings["workoutReminder"]>) =>
    setDraft((d) => ({ ...d, workoutReminder: { ...d.workoutReminder, ...patch } }));
  const setMeals = (patch: Partial<NotificationSettings["mealReminders"]>) =>
    setDraft((d) => ({ ...d, mealReminders: { ...d.mealReminders, ...patch } }));
  const mealItems = draft.mealReminders.items;
  const updateMealItem = (index: number, patch: Partial<MealReminder>) =>
    setMeals({ items: mealItems.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const removeMealItem = (index: number) => setMeals({ items: mealItems.filter((_, i) => i !== index) });
  const addMealItem = () =>
    setMeals({ items: [...mealItems, { time: nextFreeReminderTime(mealItems), label: t("Bữa phụ") }] });

  async function handleSave() {
    if (!TIME_REGEX.test(draft.workoutReminder.time)) {
      setError(t("Giờ nhắc tập phải có dạng HH:mm, ví dụ 07:00."));
      return;
    }
    const mealError = validateMealReminders(mealItems);
    if (mealError) {
      setError(mealError);
      return;
    }

    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const wantsReminders = draft.workoutReminder.enabled || draft.mealReminders.enabled;
      if (wantsReminders && !(await ensurePermission())) {
        setError(PUSH_NOTES.denied);
        return;
      }
      await update(draft);
      clearFormDrafts(draftKey);
      setNotice(t("Đã lưu cài đặt thông báo."));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const pushNote =
    push && push.token === null && push.reason !== "web" ? PUSH_NOTES[push.reason] : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}
        <ErrorBanner message={error} />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Card title={t("Nhắc tập")} icon="barbell">
          <SwitchRow
            label={t("Nhắc tôi đi tập")}
            value={draft.workoutReminder.enabled}
            onChange={(enabled) => setWorkout({ enabled })}
          />
          {draft.workoutReminder.enabled ? (
            <>
              <Text style={styles.hint}>{t("Ngày nhắc tự theo lịch đang áp dụng, không nhắc ngày nghỉ. Mở app để cập nhật lịch nhắc cho 28 ngày tới.")}</Text>
              <TimeRow
                label={t("Lúc")}
                value={draft.workoutReminder.time}
                onChange={(time) => setWorkout({ time })}
              />
            </>
          ) : null}
        </Card>

        <Card title={t("Nhắc nạp dinh dưỡng")} icon="restaurant">
          <Text style={styles.hint}>{t("Mỗi bữa FitTrack báo bạn còn thiếu bao nhiêu calo và protein hôm nay. Đủ rồi thì thôi nhắc.")}</Text>
          <SwitchRow
            label={t("Nhắc tôi ăn đủ calo & protein")}
            value={draft.mealReminders.enabled}
            onChange={(enabled) => setMeals({ enabled })}
          />
          {draft.mealReminders.enabled ? (
            <>
              {mealItems.map((item, index) => (
                <MealReminderRow
                  // Index làm key: sửa giờ không làm ô đang nhập mất focus
                  key={index}
                  item={item}
                  onChange={(patch) => updateMealItem(index, patch)}
                  onRemove={() => removeMealItem(index)}
                />
              ))}
              {mealItems.length === 0 ? (
                <Text style={styles.hint}>{t("Chưa có lần nhắc nào. Thêm một lần nhắc bên dưới.")}</Text>
              ) : null}
              {mealItems.length < MAX_MEAL_REMINDERS ? (
                <Button title={t("+ Thêm lần nhắc")} variant="secondary" onPress={addMealItem} />
              ) : null}
            </>
          ) : null}
        </Card>

        <Card title={t("Thông báo từ FitTrack")} icon="notifications">
          <SwitchRow
            label={t("🏆 Khi phá kỷ lục cá nhân")}
            value={draft.prAlerts}
            onChange={(prAlerts) => setDraft((d) => ({ ...d, prAlerts }))}
          />
          <SwitchRow
            label={t("🎯 Khi đạt cân nặng mục tiêu")}
            value={draft.goalAlerts}
            onChange={(goalAlerts) => setDraft((d) => ({ ...d, goalAlerts }))}
          />
          <SwitchRow
            label={t("📊 Tổng kết tuần (sáng thứ Hai)")}
            value={draft.weeklyReport}
            onChange={(weeklyReport) => setDraft((d) => ({ ...d, weeklyReport }))}
          />
        </Card>

        <Button title={t("Lưu cài đặt")} onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
        // Núm trắng cho mọi nền tảng (web mặc định màu xanh ngọc, lệch tông cam)
        thumbColor={colors.onGradient}
      />
    </View>
  );
}

// Một lần nhắc nạp dinh dưỡng: tên + giờ, sửa tại chỗ, nút xoá
function MealReminderRow({
  item,
  onChange,
  onRemove,
}: {
  item: MealReminder;
  onChange: (patch: Partial<MealReminder>) => void;
  onRemove: () => void;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const invalid = !TIME_REGEX.test(item.time);
  return (
    <View style={styles.row}>
      <TextInput
        value={item.label}
        onChangeText={(label) => onChange({ label })}
        placeholder={t("Tên, ví dụ Bữa phụ")}
        placeholderTextColor={colors.textMuted}
        maxLength={30}
        accessibilityLabel={t("Tên lần nhắc")}
        style={[styles.labelInput, !item.label.trim() && styles.timeInvalid]}
      />
      <TextInput
        value={item.time}
        onChangeText={(time) => onChange({ time })}
        placeholder="HH:mm"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        accessibilityLabel={t("Giờ nhắc {value1}", { value1: item.label })}
        style={[styles.timeInput, invalid && styles.timeInvalid]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Xoá lần nhắc {value1}", { value1: item.label })}
        hitSlop={8}
        onPress={onRemove}
        style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </Pressable>
    </View>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const invalid = !TIME_REGEX.test(value);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="HH:mm"
        placeholderTextColor={colors.textMuted}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        accessibilityLabel={t("Giờ {value1}", { value1: label })}
        style={[styles.timeInput, invalid && styles.timeInvalid]}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  hint: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  note: {
    fontSize: 13,
    color: colors.textMuted,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    lineHeight: 19,
  },
  notice: { fontSize: 14, color: colors.success },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  days: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  day: {
    minWidth: 40,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 13, color: colors.text },
  dayTextSelected: { color: colors.onPrimary, fontWeight: "600" },
  labelInput: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  removeButton: { padding: spacing.xs },
  timeInput: {
    width: 80,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: "center",
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  timeInvalid: { borderColor: colors.danger },
}));
