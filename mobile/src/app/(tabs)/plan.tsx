import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PlanDayCard } from '@/components/plan/PlanDayCard';
import { planStyles as s } from '@/components/plan/planStyles';
import { subscribeProfileRefresh } from '@/stores/profileStore';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import { personalPlanApi } from '@/api/personalPlanApi';
import { newPlanRequestId } from '@/lib/personalPlan';
import { errorMessage } from '@/lib/formErrors';
import { isFailedPlanGeneration } from '@/lib/planGeneration';
import { colors } from '@/constants/theme';
import { useDraftState } from '@/hooks/useDraftState';
export default function PlanScreen() {
  const { t } = useTranslation();
  const { data, survey, isLoading, error, load } = usePersonalPlanStore();
  const [view, setView] = useState<'today' | 'week'>('today');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestId, setRequestId] = useDraftState('personal-plan-tab-generation', newPlanRequestId);
  const [generationFailed, setGenerationFailed] = useState(false);
  useFocusEffect(useCallback(() => { void load(); return subscribeProfileRefresh(() => { void load(); }); }, [load]));
  async function create() {
    if (busy) return;
    if (!survey) { router.push('/plan/survey'); return; }
    // Retain the initial ID before sending; untouched useDraftState values are not cached.
    setRequestId(requestId);
    setBusy(true); setFormError(null);
    try { const draft = await personalPlanApi.createDraft(requestId); setRequestId(newPlanRequestId()); router.push({ pathname: '/plan/draft', params: { id: draft.id } }); }
    catch (e) { setFormError(errorMessage(e)); if (isFailedPlanGeneration(e)) setGenerationFailed(true); }
    finally { setBusy(false); }
  }
  const plan = data?.current;
  const days = plan?.days.filter(d => view === 'week' || d.date === data?.today) ?? [];
  return <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} />}>
    <Button title={t('PT AI của bạn')} onPress={() => router.push('/plan/coach')} />
    <Card title={t('Kế hoạch cá nhân')} icon='calendar-outline'>
      <Text style={s.muted}>{t('Yoga hoặc đi bộ theo lịch rảnh, kết hợp dinh dưỡng đang dùng.')}</Text>
      <View style={s.row}><Button title={t('Hôm nay')} variant={view === 'today' ? 'primary' : 'secondary'} onPress={() => setView('today')} /><Button title={t('Cả tuần')} variant={view === 'week' ? 'primary' : 'secondary'} onPress={() => setView('week')} /></View>
      <Button title={t(survey ? 'Chỉnh khảo sát' : 'Bắt đầu khảo sát')} variant='secondary' onPress={() => router.push('/plan/survey')} />
      <Button title={t('Tạo bản nháp 7 ngày')} onPress={create} loading={busy} />
      <Button title={t('Lịch sử kế hoạch')} variant='secondary' onPress={() => router.push('/plan/history')} />
    </Card>
    <ErrorBanner message={formError ?? error} />
    {busy ? <Text style={s.muted}>{t('Đang xử lý yêu cầu AI. Vui lòng chờ; thử lại sau lỗi mạng sẽ dùng cùng yêu cầu.')}</Text> : null}
    {generationFailed ? <Button title={t('Bắt đầu yêu cầu AI mới')} variant='secondary' disabled={busy} onPress={() => { setRequestId(newPlanRequestId()); setGenerationFailed(false); setFormError(null); }} /> : null}
    {error ? <Button title={t('Thử lại')} variant='secondary' onPress={load} /> : null}
    {isLoading && !data ? <ActivityIndicator color={colors.primary} /> : null}
    {!plan && !isLoading ? <Card><Text style={s.text}>{t('Chưa có kế hoạch đang áp dụng.')}</Text></Card> : null}
    {data?.expired ? <Card><Text style={s.text}>{t('Kế hoạch đã kết thúc. Tạo bản nháp mới để tiếp tục.')}</Text></Card> : null}
    {plan?.targetChanged ? <Card><Text style={s.muted}>{t('Target đã thay đổi. Tạo kế hoạch mới để dùng chỉ tiêu hiện tại; lịch sử được giữ nguyên.')}</Text></Card> : null}
    {plan?.coachSummary ? <Card title={t('Lý do đề xuất của PT')}><Text style={s.text}>{plan.coachSummary}</Text></Card> : null}
    {data?.pending ? <Card title={t('Kế hoạch sắp áp dụng')}><Text style={s.text}>{data.pending.startDate} → {data.pending.endDate}</Text><Button title={t('Xem kế hoạch')} variant='secondary' onPress={() => router.push({ pathname: '/plan/history', params: { id: data.pending!.id } })} /></Card> : null}
    {days.map(day => <PlanDayCard key={plan!.id + day.date} plan={plan!} day={day} today={data!.today} onRefresh={load} />)}
  </ScrollView>;
}
