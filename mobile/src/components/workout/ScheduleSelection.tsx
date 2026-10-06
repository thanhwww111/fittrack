import { translate as t, useTranslation } from "@/i18n";
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Switch, Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import { programApi } from '@/api/workoutApi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { colors, getActiveScheme, radius, spacing, themedStyles } from '@/constants/theme';
import { errorMessage } from '@/lib/formErrors';
import { dayName } from '@/lib/goal';
import { defaultTrainingDays, mapTrainingDays, scheduleRequestId } from '@/lib/trainingSchedule';
import { useTrainingScheduleStore } from '@/stores/trainingScheduleStore';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { ProgramPreset, WeeklyProgram } from '@/types/models';
import { ExerciseNote } from './ExerciseNote';
import { ExerciseGuideButton } from './ExerciseGuideButton';

export function ScheduleSelection({ onApplied, setup = false }: { onApplied?: () => void; setup?: boolean }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [presets, setPresets] = useState<ProgramPreset[]>([]);
  const [selected, setSelected] = useState<ProgramPreset | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reminder, setReminder] = useState<boolean | null>(null);
  const trainingDaysPerWeek = useProfileStore(s => s.profile?.trainingDaysPerWeek);
  const settings = useNotificationStore(s => s.settings);
  const data = useTrainingScheduleStore(s => s.data);
  const attempt = useRef<{ key: string; requestId: string; program?: WeeklyProgram } | null>(null);
  const saving = useRef(false);
  const load = () => programApi.presets().then(setPresets).catch(e => setError(errorMessage(e)));
  useEffect(() => { void load(); void useTrainingScheduleStore.getState().load(); }, []);
  function selectPreset(preset: ProgramPreset) {
    setSelected(preset); setDays(defaultTrainingDays(preset)); attempt.current = null; setError(null);
  }
  async function apply() {
    if (!selected || saving.current) return;
    try { mapTrainingDays(selected.days.map(d => d.name), days); } catch (e) { setError((e as Error).message); return; }
    saving.current = true; setBusy(true); setError(null);
    const key = `${selected.key}:${[...days].sort().join(',')}`;
    if (attempt.current?.key !== key) attempt.current = { key, requestId: scheduleRequestId() };
    const pending = attempt.current;
    try {
      pending.program ??= await programApi.applyPreset(selected.key, pending.requestId);
      const ordered = [...pending.program.days].sort((a,b) => a.dayOfWeek-b.dayOfWeek);
      await programApi.update(pending.program.id, { days: mapTrainingDays(ordered.map(d => d.templateId), days) });
      const result = await useTrainingScheduleStore.getState().apply(pending.program.id, pending.requestId);
      setNotice(t("Đã áp dụng từ {value1}.", { value1: result.pending?.effectiveFrom ?? result.current?.effectiveFrom }));
      if (reminder !== null) {
        try { await useNotificationStore.getState().update({ workoutReminder: { enabled: reminder } }); }
        catch { setNotice(t("Đã lưu lịch. Bạn có thể thử bật nhắc tập lại trong Cài đặt.")); }
      }
      attempt.current = null;
      onApplied?.();
    } catch (e) { setError(errorMessage(e)); }
    finally { saving.current = false; setBusy(false); }
  }
  return <View style={styles.content}>
    <ErrorBanner message={error} />
    {!presets.length ? <Button title={t("Tải lại lịch đề xuất")} onPress={load} /> : null}
    {presets.map(p => {
      const recommended = p.daysPerWeek === trainingDaysPerWeek;
      const title = p.name.endsWith(`· ${p.days.length} buổi`) ? t(p.name) : t("{value1} · {value2} buổi", { value1: t(p.name), value2: p.days.length });
      return <Pressable key={p.key} accessibilityRole="button" accessibilityLabel={recommended ? `${title} · ${t("Đề xuất")}` : title}
        accessibilityState={{ selected: selected?.key === p.key, disabled: busy }} disabled={busy}
        onPress={() => selectPreset(p)} style={({ pressed }) => [styles.preset, recommended && styles.recommended, selected?.key === p.key && styles.selectedPreset, pressed && styles.pressed, busy && styles.disabled]}>
        {recommended ? <View style={styles.badge}><Text style={styles.badgeText}>{t("Đề xuất")}</Text></View> : null}
        <Text style={styles.presetTitle}>{title}</Text>
      </Pressable>;
    })}
    {selected ? <Card title={t(selected.name)}>
      <Text style={styles.text}>{t(selected.description)}</Text>
      <Text style={styles.text}>{t("Chọn đúng {value1} ngày. Các buổi xếp theo thứ tăng dần.", { value1: selected.days.length })}</Text>
      <View style={styles.week}>{[1,2,3,4,5,6,7].map(d => <Pressable key={d} accessibilityRole="checkbox" accessibilityLabel={dayName(d)} accessibilityState={{ checked: days.includes(d), disabled: busy }} disabled={busy}
        onPress={() => { setDays(old => old.includes(d) ? old.filter(x => x !== d) : [...old,d]); attempt.current = null; }}
        style={[styles.day, days.includes(d) && styles.chosen]}><Text style={styles.text}>{dayName(d)}</Text></Pressable>)}</View>
      {[...days].sort((a,b)=>a-b).map((d,i) => <View key={d}><Text style={styles.text}>{dayName(d)} · {selected.days[i]?.name ?? t("Thừa ngày")}</Text>
        {selected.days[i]?.exercises.map(e => <View key={e.name}>
          <Text style={styles.muted}>{e.name} {e.sets}×{e.reps}</Text>
          <ExerciseNote name={e.name} />
          <ExerciseGuideButton name={e.name} />
        </View>)}</View>)}
      <Text style={styles.text}>{data?.current ? t("Thay đổi có hiệu lực từ ngày mai; buổi hôm nay giữ nguyên.") : t("Lịch đầu tiên có hiệu lực từ hôm nay.")}</Text>
      <View style={styles.week}><Text style={styles.text}>{t("Nhắc buổi tập lúc {value1}", { value1: settings?.workoutReminder.time ?? '07:00' })}</Text><Switch accessibilityLabel={t("Nhắc buổi tập")} value={reminder ?? settings?.workoutReminder.enabled ?? false} onValueChange={setReminder} disabled={busy} /></View>
      <Text style={styles.muted}>{t("Cần quyền thông báo trên điện thoại. Mở app để cập nhật nhắc trong 28 ngày tới.")}</Text>
      <Button title={t("Áp dụng lịch")} loading={busy} onPress={apply} />
    </Card> : null}
    {notice ? <Text style={styles.text}>{notice}</Text> : null}
    {setup && selected ? <Text style={styles.editHint}>{t("Bạn có thể chỉnh sửa lịch tập sau khi đăng ký.")}</Text> : null}
    <Button title={t("Tự tạo lịch tuần")} variant="accent" disabled={busy} onPress={() => router.push({ pathname: '/workout/program', params: setup ? { setup: '1' } : {} })} />
  </View>;
}
const styles = themedStyles(() => ({ content: { gap: spacing.md },
  preset: { minHeight: 54, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  recommended: { marginTop: spacing.sm, borderColor: colors.primary, paddingTop: spacing.lg },
  selectedPreset: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 },
  presetTitle: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  badge: { position: 'absolute', top: -10, right: spacing.md, borderRadius: radius.pill, backgroundColor: getActiveScheme() === 'dark' ? '#211806' : colors.primarySoft, borderWidth: 1, borderColor: getActiveScheme() === 'dark' ? '#FFD277' : colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { color: getActiveScheme() === 'dark' ? '#FFD277' : colors.primaryText, fontSize: 11, fontWeight: '800' },
  editHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.8 }, disabled: { opacity: 0.5 }, text: { color: colors.text, fontSize: 14 }, muted: { color: colors.textMuted, fontSize: 13 }, week: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }, day: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }, chosen: { backgroundColor: colors.primarySoft, borderColor: colors.primary } }));
