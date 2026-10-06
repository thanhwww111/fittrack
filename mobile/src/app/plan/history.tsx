import { useCallback, useState } from 'react';
import { ScrollView, Text, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/i18n';
import { personalPlanApi } from '@/api/personalPlanApi';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import { errorMessage } from '@/lib/formErrors';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PlanDayCard } from '@/components/plan/PlanDayCard';
import { planStyles as s } from '@/components/plan/planStyles';
import type { PlanHistoryEntry, PersonalPlan } from '@/types/personalPlan';
import { colors } from '@/constants/theme';
export default function PlanHistoryScreen() {
  const { t } = useTranslation(); const { id } = useLocalSearchParams<{ id?: string }>();
  const [entries, setEntries] = useState<PlanHistoryEntry[]>([]); const [plan, setPlan] = useState<PersonalPlan | null>(null);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const today = usePersonalPlanStore(s => s.data?.today ?? '');
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setError(null);
    void (id ? personalPlanApi.historyPlan(id).then(value => { if (active) setPlan(value); }) : personalPlanApi.history().then(value => { if (active) setEntries(value); }))
      .catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]));
  return <ScrollView contentContainerStyle={s.content}>
    <ErrorBanner message={error} />{loading ? <ActivityIndicator color={colors.primary} /> : null}
    {!id && !entries.length && !loading ? <Text style={s.muted}>{t('Chưa có lịch sử kế hoạch.')}</Text> : null}
    {entries.map(entry => <Card key={entry.id} title={entry.sport === 'YOGA' ? t('Yoga') : t('Đi bộ')}><Text style={s.text}>{entry.startDate} → {entry.endDate}</Text><Button title={t('Xem kế hoạch')} onPress={() => router.push({ pathname: '/plan/history', params: { id: entry.id } })} /></Card>)}
    {id && plan ? plan.days.map(day => <PlanDayCard key={day.date} plan={plan} day={day} today={today} onRefresh={async () => { if (id) setPlan(await personalPlanApi.historyPlan(id)); }} />) : null}
  </ScrollView>;
}
