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
import { useNotificationStore } from "@/stores/notificationStore";
import type { NotificationSettings } from "@/types/models";

// Hiển thị theo thứ tự T2 → CN, giá trị 0 = CN như server
const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const PUSH_NOTES: Record<string, string> = {
  "expo-go":
    "Bạn đang dùng Expo Go: lịch nhắc vẫn hoạt động, nhưng thông báo từ server (PR, mục tiêu, báo cáo tuần) cần bản build của app.",
  simulator: "Máy ảo không nhận được thông báo từ server, hãy thử trên điện thoại thật.",
  "no-project": "App chưa được liên kết với EAS (thiếu projectId) nên chưa nhận được thông báo từ server.",
  denied: "Bạn đã tắt quyền thông báo. Bật lại trong Cài đặt của điện thoại để nhận thông báo.",
  error: "Không đăng ký được thông báo từ server, thử mở lại app sau.",
};

export default function NotificationSettingsScreen() {
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
  const update = useNotificationStore((s) => s.update);
  const push = useNotificationStore((s) => s.push);

  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setWorkout = (patch: Partial<NotificationSettings["workoutReminder"]>) =>
    setDraft((d) => ({ ...d, workoutReminder: { ...d.workoutReminder, ...patch } }));
  const setMeals = (patch: Partial<NotificationSettings["mealReminders"]>) =>
    setDraft((d) => ({ ...d, mealReminders: { ...d.mealReminders, ...patch } }));

  function toggleDay(day: number) {
    const days = draft.workoutReminder.days;
    setWorkout({ days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] });
  }

  async function handleSave() {
    const times = [
      draft.workoutReminder.time,
      draft.mealReminders.breakfast,
      draft.mealReminders.lunch,
      draft.mealReminders.dinner,
    ];
    if (times.some((t) => !TIME_REGEX.test(t))) {
      setError("Giờ phải có dạng HH:mm, ví dụ 07:30 hoặc 18:00.");
      return;
    }
    if (draft.workoutReminder.enabled && draft.workoutReminder.days.length === 0) {
      setError("Chọn ít nhất một ngày để nhắc tập.");
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
      setNotice("Đã lưu cài đặt thông báo.");
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

        <Card title="Nhắc tập">
          <SwitchRow
            label="Nhắc tôi đi tập"
            value={draft.workoutReminder.enabled}
            onChange={(enabled) => setWorkout({ enabled })}
          />
          {draft.workoutReminder.enabled ? (
            <>
              <View style={styles.days}>
                {WEEKDAYS.map((d) => {
                  const selected = draft.workoutReminder.days.includes(d.value);
                  return (
                    <Pressable
                      key={d.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleDay(d.value)}
                      style={[styles.day, selected && styles.daySelected]}
                    >
                      <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TimeRow
                label="Lúc"
                value={draft.workoutReminder.time}
                onChange={(time) => setWorkout({ time })}
              />
            </>
          ) : null}
        </Card>

        <Card title="Nhắc ghi bữa ăn">
          <SwitchRow
            label="Nhắc tôi ghi bữa ăn"
            value={draft.mealReminders.enabled}
            onChange={(enabled) => setMeals({ enabled })}
          />
          {draft.mealReminders.enabled ? (
            <>
              <TimeRow label="Bữa sáng" value={draft.mealReminders.breakfast} onChange={(breakfast) => setMeals({ breakfast })} />
              <TimeRow label="Bữa trưa" value={draft.mealReminders.lunch} onChange={(lunch) => setMeals({ lunch })} />
              <TimeRow label="Bữa tối" value={draft.mealReminders.dinner} onChange={(dinner) => setMeals({ dinner })} />
            </>
          ) : null}
        </Card>

        <Card title="Thông báo từ FitTrack">
          <SwitchRow
            label="🏆 Khi phá kỷ lục cá nhân"
            value={draft.prAlerts}
            onChange={(prAlerts) => setDraft((d) => ({ ...d, prAlerts }))}
          />
          <SwitchRow
            label="🎯 Khi đạt cân nặng mục tiêu"
            value={draft.goalAlerts}
            onChange={(goalAlerts) => setDraft((d) => ({ ...d, goalAlerts }))}
          />
          <SwitchRow
            label="📊 Tổng kết tuần (sáng thứ Hai)"
            value={draft.weeklyReport}
            onChange={(weeklyReport) => setDraft((d) => ({ ...d, weeklyReport }))}
          />
        </Card>

        <Button title="Lưu cài đặt" onPress={handleSave} loading={saving} />
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
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
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
        accessibilityLabel={`Giờ ${label}`}
        style={[styles.timeInput, invalid && styles.timeInvalid]}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
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
