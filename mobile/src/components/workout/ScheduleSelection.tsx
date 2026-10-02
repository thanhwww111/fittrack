import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { programApi } from '@/api/workoutApi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { colors, spacing, themedStyles } from '@/constants/theme';
import { errorMessage } from '@/lib/formErrors';
import { dayName } from '@/lib/goal';
import { defaultTrainingDays, mapTrainingDays, scheduleRequestId } from '@/lib/trainingSchedule';
import { useTrainingScheduleStore } from '@/stores/trainingScheduleStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { ProgramPreset, WeeklyProgram } from '@/types/models';

export function ScheduleSelection({ onApplied, setup = false }: { onApplied?: () => void; setup?: boolean }) {
  const [presets, setPresets] = useState<ProgramPreset[]>([]);
  const [selected, setSelected] = useState<ProgramPreset | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reminder, setReminder] = useState<boolean | null>(null);
  const settings = useNotificationStore(s => s.settings);
  const data = useTrainingScheduleStore(s => s.data);
  const attempt = useRef<{ key: string; requestId: string; program?: WeeklyProgram } | null>(null);
  const saving = useRef(false);
  const load = () => programApi.presets().then(setPresets).catch(e => setError(errorMessage(e)));
  useEffect(() => { void load(); void useTrainingScheduleStore.getState().load(); }, []);
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
      setNotice(`Đã áp dụng từ ${result.pending?.effectiveFrom ?? result.current?.effectiveFrom}.`);
      if (reminder !== null) {
        try { await useNotificationStore.getState().update({ workoutReminder: { enabled: reminder } }); }
        catch { setNotice('Đã lưu lịch. Bạn có thể thử bật nhắc tập lại trong Cài đặt.'); }
      }
      attempt.current = null;
      onApplied?.();
    } catch (e) { setError(errorMessage(e)); }
    finally { saving.current = false; setBusy(false); }
  }
  return <View style={styles.content}>
    <ErrorBanner message={error} />
    {!presets.length ? <Button title="Tải lại lịch đề xuất" onPress={load} /> : null}
    {presets.map(p => <Button key={p.key} title={`${p.name} · ${p.days.length} buổi`} variant={selected?.key === p.key ? 'primary' : 'secondary'} disabled={busy}
      onPress={() => { setSelected(p); setDays(defaultTrainingDays(p)); attempt.current = null; setError(null); }} />)}
    {selected ? <Card title={selected.name}>
      <Text style={styles.text}>{selected.description}</Text>
      <Text style={styles.text}>Chọn đúng {selected.days.length} ngày. Các buổi xếp theo thứ tăng dần.</Text>
      <View style={styles.week}>{[1,2,3,4,5,6,7].map(d => <Pressable key={d} accessibilityRole="checkbox" accessibilityLabel={dayName(d)} accessibilityState={{ checked: days.includes(d), disabled: busy }} disabled={busy}
        onPress={() => { setDays(old => old.includes(d) ? old.filter(x => x !== d) : [...old,d]); attempt.current = null; }}
        style={[styles.day, days.includes(d) && styles.chosen]}><Text style={styles.text}>{dayName(d)}</Text></Pressable>)}</View>
      {[...days].sort((a,b)=>a-b).map((d,i) => <View key={d}><Text style={styles.text}>{dayName(d)} · {selected.days[i]?.name ?? 'Thừa ngày'}</Text>
        <Text style={styles.muted}>{selected.days[i]?.exercises.map(e => `${e.name} ${e.sets}×${e.reps}`).join(', ')}</Text></View>)}
      <Text style={styles.text}>{data?.current ? 'Thay đổi có hiệu lực từ ngày mai; buổi hôm nay giữ nguyên.' : 'Lịch đầu tiên có hiệu lực từ hôm nay.'}</Text>
      <View style={styles.week}><Text style={styles.text}>Nhắc buổi tập lúc {settings?.workoutReminder.time ?? '07:00'}</Text><Switch accessibilityLabel="Nhắc buổi tập" value={reminder ?? settings?.workoutReminder.enabled ?? false} onValueChange={setReminder} disabled={busy} /></View>
      <Text style={styles.muted}>Cần quyền thông báo trên điện thoại. Mở app để cập nhật nhắc trong 28 ngày tới.</Text>
      <Button title="Áp dụng lịch" loading={busy} onPress={apply} />
    </Card> : null}
    {notice ? <Text style={styles.text}>{notice}</Text> : null}
    <Button title="Tự tạo lịch tuần" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: '/workout/program', params: setup ? { setup: '1' } : {} })} />
  </View>;
}
const styles = themedStyles(() => ({ content: { gap: spacing.md }, text: { color: colors.text, fontSize: 14 }, muted: { color: colors.textMuted, fontSize: 13 }, week: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }, day: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }, chosen: { backgroundColor: colors.primarySoft, borderColor: colors.primary } }));
