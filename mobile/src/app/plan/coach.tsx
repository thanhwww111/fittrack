import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useCoachStore, defaultCoachSettings } from '@/stores/coachStore';
import { useAuthStore } from '@/stores/authStore';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { personalPlanApi } from '@/api/personalPlanApi';
import { ApiError } from '@/api/client';
import { newPlanRequestId } from '@/lib/personalPlan';
import { errorMessage } from '@/lib/formErrors';
import { isFailedPlanGeneration } from '@/lib/planGeneration';
import { useDraftState } from '@/hooks/useDraftState';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { planStyles as s } from '@/components/plan/planStyles';
import { colors } from '@/constants/theme';
import type { CoachReviewKind, CoachSettings } from '@/types/coach';

const pushNotes = {
  web: 'Push cần ứng dụng trên thiết bị thật.', simulator: 'Push cần ứng dụng trên thiết bị thật.',
  'expo-go': 'Push cần bản development hoặc EAS build.', 'no-project': 'Push chưa được cấu hình cho bản ứng dụng này.',
  denied: 'Chưa cấp quyền thông báo.', error: 'Chưa đăng ký được push. Mở cài đặt thông báo để thử lại.',
};

export default function CoachScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const { data, settings, isLoading, busy, error, load, saveSettings, checkIn, review } = useCoachStore();
  const survey = usePersonalPlanStore(state => state.survey);
  const push = useNotificationStore(state => state.push);
  const pushError = useNotificationStore(state => state.error);
  const key = `coach-${userId}`;
  const [dailyId, setDailyId] = useDraftState(key + '-daily', newPlanRequestId());
  const [weeklyId, setWeeklyId] = useDraftState(key + '-weekly', newPlanRequestId());
  const [draftId, setDraftId] = useDraftState(key + '-draft', newPlanRequestId());
  const [energy, setEnergy] = useState('3'); const [difficulty, setDifficulty] = useState('3');
  const [note, setNote] = useDraftState(key + '-note', '');
  const [editedSettings, setEditedSettings] = useState<CoachSettings | null>(null);
  const form = editedSettings ?? settings ?? defaultCoachSettings;
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [failedKind, setFailedKind] = useState<'DRAFT' | CoachReviewKind | null>(null);
  const actionLock = useRef(false);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const blocked = busy || working || isLoading;
  async function run(task: () => Promise<void>, kind?: 'DRAFT' | CoachReviewKind) {
    if (actionLock.current || blocked) return;
    actionLock.current = true; setWorking(true); setLocalError(null); setNotice(null);
    const current = () => useAuthStore.getState().isAuthenticated && useAuthStore.getState().user?.id === userId;
    try { await task(); if (current() && kind) setFailedKind(null); }
    catch (e) { if (current()) {
      setLocalError(errorMessage(e));
      if (kind && e instanceof ApiError && typeof e.details === 'object' && e.details !== null && 'code' in e.details && e.details.code === 'COACH_REQUEST_FAILED') setFailedKind(kind);
      if (kind === 'DRAFT' && isFailedPlanGeneration(e)) setFailedKind('DRAFT');
    } }
    finally { actionLock.current = false; if (current()) setWorking(false); }
  }
  async function requestReview(kind: CoachReviewKind) {
    (kind === 'DAILY' ? setDailyId : setWeeklyId)(kind === 'DAILY' ? dailyId : weeklyId);
    await review(kind === 'DAILY' ? dailyId : weeklyId, kind);
    if (useAuthStore.getState().user?.id !== userId) return;
    (kind === 'DAILY' ? setDailyId : setWeeklyId)(newPlanRequestId());
  }
  function patch(value: Partial<CoachSettings>) { setEditedSettings({ ...form, ...value }); }
  const rating = (label: string, value: string, onChange: (v: string) => void) => <ChipGroup label={t(label)} value={value} onChange={onChange} options={['1', '2', '3', '4', '5'].map(v => ({ value: v, label: v }))} />;
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps='handled'>
    <Card title={t('PT AI của bạn')}>
      <Text style={s.muted}>{t('Trao đổi với PT, ghi cảm nhận và xem đề xuất trước khi áp dụng.')}</Text>
      {data ? <Text style={s.badge}>{data.today}</Text> : null}
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      <ErrorBanner message={localError ?? error} />
      {failedKind ? <>
        <Text style={s.muted}>{t('Yêu cầu trước đã thất bại. Bạn có thể bắt đầu yêu cầu mới.')}</Text>
        <Button title={t('Bắt đầu yêu cầu AI mới')} disabled={blocked} onPress={() => {
          (failedKind === 'DRAFT' ? setDraftId : failedKind === 'DAILY' ? setDailyId : setWeeklyId)(newPlanRequestId());
          setFailedKind(null); setLocalError(null); useCoachStore.setState({ error: null });
        }} />
      </> : null}
      {notice ? <Text style={s.badge}>{notice}</Text> : null}
      <Button title={t('Tải lại PT')} variant='secondary' disabled={blocked} onPress={() => { setLocalError(null); void load(); }} />
    </Card>
    <Card title={t('Lời khuyên hôm nay')}>
      <Text style={s.text}>{data?.dailyAdvice ?? t('Chưa có lời khuyên AI. Yêu cầu PT phân tích để tiếp tục.')}</Text>
      <Button title={t('Phân tích hôm nay')} disabled={blocked || !data} onPress={() => void run(() => requestReview('DAILY'), 'DAILY')} />
    </Card>
    <Card title={t('Lịch tập cá nhân hóa')}>
      <Text style={s.muted}>{t('PT dựa vào hồ sơ, lịch rảnh và cảm nhận để đề xuất 7 ngày. Đây là đề xuất để bạn xem trước, chưa thay đổi lịch hiện tại.')}</Text>
      {data?.trainingProposal?.map(day => <View key={day.date} style={s.item}>
        <Text style={s.badge}>{day.date} · {t(day.activity === 'REST' ? 'Nghỉ phục hồi' : day.activity === 'GYM' ? 'Gym' : day.activity === 'YOGA' ? 'Yoga' : 'Đi bộ')}</Text>
        <Text style={s.text}>{day.title}{day.minutes ? ` · ${day.minutes} ${t('phút')}` : ''}{day.time ? ` · ${day.time}` : ''}</Text>
        <Text style={s.muted}>{day.rationale}</Text>
      </View>)}
      <Text style={s.text} selectable>{data?.weeklyReview ?? t('Chưa có đánh giá tuần.')}</Text>
      <Button title={t('Đề xuất lịch tập cá nhân')} variant='secondary' disabled={blocked || !data} onPress={() => void run(() => requestReview('WEEKLY'), 'WEEKLY')} />
    </Card>
    <Card title={t('Cảm nhận hôm nay')}>
      {rating('Năng lượng (1 thấp, 5 cao)', energy, setEnergy)}
      {rating('Độ khó (1 dễ, 5 khó)', difficulty, setDifficulty)}
      <TextField label={t('Ghi chú cho PT')} value={note} onChangeText={setNote} maxLength={1000} multiline editable={!blocked} />
      <Button title={t('Lưu cảm nhận')} disabled={blocked || !data} onPress={() => void run(async () => { await checkIn({ energy: Number(energy), difficulty: Number(difficulty), note }); if (useAuthStore.getState().user?.id === userId) setNotice(t('Đã lưu cảm nhận hôm nay.')); })} />
    </Card>
    <Card title={t('Kế hoạch tiếp theo')}>
      <Text style={s.muted}>{t('AI tạo bản nháp để bạn xem và chỉnh sửa. Chỉ áp dụng khi bạn xác nhận.')}</Text>
      {working ? <Text style={s.muted}>{t('Đang xử lý yêu cầu AI. Vui lòng chờ; thử lại sau lỗi mạng sẽ dùng cùng yêu cầu.')}</Text> : null}
      <Button title={t('Tạo bản nháp AI tiếp theo')} disabled={blocked} onPress={() => void run(async () => {
        if (!survey) { router.push('/plan/survey'); return; }
        setDraftId(draftId);
        const draft = await personalPlanApi.createDraft(draftId);
        if (useAuthStore.getState().user?.id !== userId) return;
        setDraftId(newPlanRequestId()); router.push({ pathname: '/plan/draft', params: { id: draft.id } });
      }, 'DRAFT')} />
      <Button title={t('Chỉnh khảo sát')} variant='secondary' onPress={() => router.push('/plan/survey')} />
    </Card>
    <Card title={t('Cài đặt PT chủ động')}>
      <View style={s.row}><Text style={s.text}>{t('Nhận nhắc nhở từ PT')}</Text><Switch accessibilityLabel={t('Nhận nhắc nhở từ PT')} value={form.enabled} disabled={blocked || !settings} onValueChange={enabled => patch({ enabled })} /></View>
      <Text style={s.muted}>{t('Giờ yên lặng theo múi giờ trong hồ sơ. Chat và lời khuyên vẫn dùng được khi tắt push.')}</Text>
      <ChipGroup label={t('Số nhắc tối đa mỗi ngày')} value={String(form.maxPerDay)} onChange={v => patch({ maxPerDay: Number(v) as CoachSettings['maxPerDay'] })} options={['1', '2', '3', '5'].map(v => ({ value: v, label: v }))} />
      <TextField label={t('Bắt đầu yên lặng (HH:mm)')} value={form.quietStart} onChangeText={quietStart => patch({ quietStart })} editable={!blocked} />
      <TextField label={t('Kết thúc yên lặng (HH:mm)')} value={form.quietEnd} onChangeText={quietEnd => patch({ quietEnd })} editable={!blocked} />
      <ChipGroup label={t('Giọng PT')} value={form.tone} onChange={tone => patch({ tone })} options={[{ value: 'GENTLE', label: t('Nhẹ nhàng') }, { value: 'FIRM', label: t('Nghiêm túc') }]} />
      <ChipGroup label={t('Ngôn ngữ PT')} value={form.language} onChange={language => patch({ language })} options={[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }]} />
      {form.snoozedUntil ? <Text style={s.muted}>{t('Tạm dừng đến {time}', { time: form.snoozedUntil })}</Text> : null}
      <View style={s.row}><Button title={t('Tạm dừng 24 giờ')} variant='secondary' disabled={blocked} onPress={() => patch({ snoozedUntil: new Date(Date.now() + 86400000).toISOString() })} /><Button title={t('Tiếp tục nhắc')} variant='secondary' disabled={blocked} onPress={() => patch({ snoozedUntil: null })} /></View>
      <Button title={t('Lưu cài đặt PT')} disabled={blocked || !settings} onPress={() => void run(async () => { await saveSettings(form); if (useAuthStore.getState().user?.id === userId) { setEditedSettings(null); setNotice(t('Đã lưu cài đặt PT.')); } })} />
      <Text style={s.muted}>{t(push?.token ? 'Thiết bị đã đăng ký push. Việc gửi còn phụ thuộc dịch vụ thông báo.' : push && 'reason' in push ? pushNotes[push.reason] : 'Đang kiểm tra trạng thái push.')}</Text>
      <ErrorBanner message={pushError} />
      <Button title={t('Cài đặt thông báo')} variant='secondary' onPress={() => router.push('/settings/notifications')} />
    </Card>
  </ScrollView>;
}
