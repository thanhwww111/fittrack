import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { weeklyCheckInApi, type WeeklyCheckInStatus } from "@/api/weeklyCheckInApi";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { errorMessage, parseNumber } from "@/lib/formErrors";
import { weekInTimezone } from "@/lib/weeklyCheckIn";
import { promptTargetRecalculation } from "@/lib/targetRecalculation";
import { readDraft, writeDraft } from "@/lib/formDrafts";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import type { UserProfile } from "@/types/models";

// A modal overlays the existing stack instead of replacing it: drafts and the
// active workout remain mounted. The server decides completion for this account.
export function WeeklyCheckInGate({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<WeeklyCheckInStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState(String(profile.height ?? ""));
  const [fields, setFields] = useState<{ weight?: string; height?: string }>({});
  const alive = useRef(true);
  const revision = useRef(0);
  const busy = useRef(false);
  const probing = useRef(false);
  const checkedWeek = useRef("");
  const dueWeek = useRef("");
  const latestHeight = useRef(profile.height);
  const { userId, timezone } = profile;
  useEffect(() => { latestHeight.current = profile.height; }, [profile.height]);

  const check = useCallback(async (force = false) => {
    if (busy.current || probing.current) return;
    const week = weekInTimezone(timezone);
    if (!force && checkedWeek.current === week) return;
    probing.current = true;
    const version = ++revision.current;
    try {
      const result = await weeklyCheckInApi.status();
      if (!alive.current || version !== revision.current) return;
      checkedWeek.current = week;
      if (result.required && dueWeek.current !== result.weekStart) {
        dueWeek.current = result.weekStart;
        setWeight(""); setHeight(String(latestHeight.current ?? "")); setFields({});
      }
      setStatus(result); setError(null);
    } catch (err) {
      if (alive.current && version === revision.current) {
        // Completion in a previous week never bypasses a failed new-week check.
        if (checkedWeek.current !== week) setStatus(null);
        setError(errorMessage(err));
      }
    } finally {
      if (version === revision.current) {
        probing.current = false;
        if (alive.current) setChecking(false);
      }
    }
  }, [timezone]);
  const invalidateRequests = useCallback(() => {
    alive.current = false; revision.current++; probing.current = false;
  }, []);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return check(true); });
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void check(true); });
    const timer = setInterval(() => { if (AppState.currentState === "active") void check(); }, 60_000);
    return () => { cancelled = true; invalidateRequests(); subscription.remove(); clearInterval(timer); };
  }, [check, invalidateRequests]);

  async function save() {
    if (busy.current) return;
    const w = parseNumber(weight), h = parseNumber(height);
    const next = {
      weight: w === null || !Number.isFinite(w) || w < 20 || w > 500 ? t("Nhập cân nặng từ 20 đến 500 kg.") : undefined,
      height: h === null || !Number.isFinite(h) || h < 50 || h > 300 ? t("Nhập chiều cao từ 50 đến 300 cm.") : undefined,
    };
    setFields(next);
    if (next.weight || next.height) return;
    busy.current = true; revision.current++; probing.current = false; setSaving(true); setChecking(false); setError(null);
    try {
      const result = await weeklyCheckInApi.save({ weight: w!, height: h! });
      if (!alive.current || useAuthStore.getState().user?.id !== userId) return;
      // Preserve other profile edits while replacing the two measurements just confirmed.
      const draft = readDraft<Record<string, string> | null>(userId, "profilenumbers", null);
      if (draft) writeDraft(userId, "profilenumbers", { ...draft, currentWeight: String(result.profile.currentWeight), height: String(result.profile.height) });
      useProfileStore.setState({ profile: result.profile });
      setStatus(result.status);
      checkedWeek.current = weekInTimezone(timezone);
      setWeight("");
      void promptTargetRecalculation();
    } catch (err) {
      if (alive.current) setError(errorMessage(err));
    } finally {
      busy.current = false;
      if (alive.current) setSaving(false);
    }
  }

  // Do not flash a blocking loading modal on routine foreground refreshes.
  if (status && !status.required) return null;
  return <Modal visible transparent animationType="none" onRequestClose={() => {}}>
    <KeyboardAvoidingView style={[styles.overlay, { paddingTop: Math.max(insets.top, spacing.lg), paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.panel} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {status?.required ? <>
            <Text accessibilityRole="header" style={styles.title}>{t("Cập nhật số đo tuần này")}</Text>
            <Text style={styles.text}>{t("Mỗi tuần từ thứ Hai, hãy xác nhận cân nặng và chiều cao trước khi tiếp tục.")}</Text>
            <Text style={styles.muted}>{t("Tuần bắt đầu {date}", { date: status.weekStart })}</Text>
            <TextField label={t("Cân nặng")} suffix="kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" editable={!saving} error={fields.weight} />
            <TextField label={t("Chiều cao")} suffix="cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" editable={!saving} error={fields.height} />
            <Text style={styles.muted}>{t("Chiều cao không đổi thì giữ nguyên và xác nhận. Số đo sẽ được lưu vào lịch sử.")}</Text>
            <ErrorBanner message={error} />
            <Button title={t("Lưu số đo và tiếp tục")} onPress={save} loading={saving} />
          </> : <>
            <Text style={styles.title}>{t("Kiểm tra số đo hằng tuần")}</Text>
            {checking ? <ActivityIndicator color={colors.primary} /> : <>
              <ErrorBanner message={error} />
              <Button title={t("Thử lại")} onPress={() => { setChecking(true); void check(true); }} />
            </>}
          </>}
          <Button title={t("Đăng xuất")} variant="secondary" disabled={saving} onPress={() => { void useAuthStore.getState().logout(); }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = themedStyles(() => ({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.md },
  panel: { width: "100%", maxWidth: 520, maxHeight: "100%", flexShrink: 1, backgroundColor: colors.surface, borderRadius: radius.lg },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
}));
