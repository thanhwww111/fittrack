import { useEffect, useRef, useState } from 'react';
import { Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useDraftState, clearFormDrafts } from '@/hooks/useDraftState';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useTrainingScheduleStore } from '@/stores/trainingScheduleStore';
import { OTHER_ACTIVITY_OPTIONS } from '@/constants/otherActivities';
import { colors, radius, spacing, themedStyles } from '@/constants/theme';
import { errorMessage } from '@/lib/formErrors';
import { newPlanRequestId } from '@/lib/personalPlan';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ScheduleSelection } from '@/components/workout/ScheduleSelection';
import type { PlanSport } from '@/types/personalPlan';

export function OnboardingActivitySelection() {
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const profile = useProfileStore(state => state.profile);
  const updateProfile = useProfileStore(state => state.updateProfile);
  const setOnboardingActive = useProfileStore(state => state.setOnboardingActive);
  const schedule = useTrainingScheduleStore(state => state.data);
  const [mode, setMode] = useDraftState<'GYM' | 'OTHER' | null>('onboarding-activity-mode', null);
  const [sport, setSport] = useDraftState<PlanSport | null>('onboarding-activity-sport', null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    if (mode === 'GYM' && profile?.trainingMode === 'GYM' && schedule?.current && !busy) setOnboardingActive(false);
  }, [mode, profile?.trainingMode, schedule, busy, setOnboardingActive]);
  async function chooseMode(next: 'GYM' | 'OTHER') {
    if (lock.current) return;
    setError(null);
    if (mode === next) { setMode(null); return; }
    if (next === 'OTHER') { setMode('OTHER'); return; }
    lock.current = true; setBusy(true);
    try {
      await updateProfile({ trainingMode: 'GYM' });
      if (useAuthStore.getState().user?.id === userId) setMode('GYM');
    } catch (e) { setError(errorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function continueOther() {
    if (!sport || mode !== 'OTHER' || lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      await updateProfile({ trainingMode: 'OTHER' });
      if (useAuthStore.getState().user?.id !== userId) return;
      clearFormDrafts('onboarding-activity');
      setOnboardingActive(false);
      router.replace({ pathname: '/plan/survey', params: { sport, selectionId: newPlanRequestId() } });
    } catch (e) { setError(errorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={styles.content}>
    <Card title={t('Chọn hình thức vận động')}>
      <Text style={styles.muted}>{t('Chọn Gym để lập lịch tập, hoặc chọn hình thức vận động khác rồi chọn môn phù hợp.')}</Text>
      {(['GYM', 'OTHER'] as const).map(value => {
        const label = t(value === 'GYM' ? 'Gym' : 'Hình thức vận động khác');
        const selected = mode === value;
        return <Pressable key={value} accessibilityRole='checkbox' accessibilityLabel={label} accessibilityState={{ checked: selected, disabled: busy }} disabled={busy} onPress={() => void chooseMode(value)} style={[styles.option, selected && styles.selected]}>
          <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={22} color={colors.primaryText} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>;
      })}
      <ErrorBanner message={error} />
      {mode === 'OTHER' ? <>
        <ChipGroup label={t('Môn vận động')} value={sport} options={OTHER_ACTIVITY_OPTIONS.map(option => ({ ...option, label: t(option.label) }))} onChange={value => { if (!lock.current) setSport(value); }} />
        <Button title={t('Tiếp tục khảo sát')} disabled={!sport} loading={busy} onPress={() => void continueOther()} />
      </> : null}
    </Card>
    {mode === 'GYM' && profile?.trainingMode === 'GYM' && !busy ? <ScheduleSelection setup onApplied={() => { clearFormDrafts('onboarding-activity'); setOnboardingActive(false); }} /> : null}
  </View>;
}
const styles = themedStyles(() => ({
  content: { gap: spacing.lg },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  selected: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
  label: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
}));
