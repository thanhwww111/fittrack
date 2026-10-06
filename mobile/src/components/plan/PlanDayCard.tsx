import { useMeals } from '@/hooks/useMeals';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useNutritionStore } from '@/stores/nutritionStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { MacroChips } from '@/components/nutrition/MacroChips';
import { useTranslation } from '@/i18n';
import { personalPlanApi } from '@/api/personalPlanApi';
import { validateActivityMinutes } from '@/lib/personalPlan';
import { errorMessage } from '@/lib/formErrors';
import { formatDayLabel, formatServing, mealLabel } from '@/lib/nutrition';
import { useDraftState } from '@/hooks/useDraftState';
import type { PersonalPlan, PlanDay } from '@/types/personalPlan';
import { planStyles as s } from './planStyles';
export function PlanDayCard({ plan, day, today, onRefresh, readOnly = false }: { plan: PersonalPlan; day: PlanDay; today: string; onRefresh?: () => void | Promise<void>; readOnly?: boolean }) {
  const { meals } = useMeals();
  const { t, locale } = useTranslation();
  const activity = day.activity;
  const key = `activity-${plan.id}-${activity?.id}`;
  const [minutes, setMinutes] = useDraftState(key + '-minutes', String(activity?.actualMinutes || activity?.plannedMinutes || 0));
  const [note, setNote] = useDraftState(key + '-note', activity?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canLog = !readOnly && day.effective !== false && day.date <= today;
  async function save(status: 'COMPLETED' | 'SKIPPED') {
    const actualMinutes = status === 'SKIPPED' ? 0 : validateActivityMinutes(minutes);
    if (actualMinutes === null) { setError(t('Nhập số phút từ 1 đến 1440.')); return; }
    if (!activity) return;
    setBusy(true); setError(null);
    try { await personalPlanApi.logActivity(plan.id, activity.id, { revision: activity.revision ?? 0, status, actualMinutes, note }); await onRefresh?.(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const status = activity?.status;
  return <Card title={formatDayLabel(day.date, today)} icon='calendar-outline'>
    {day.coachNote ? <Text style={s.muted}>{day.coachNote}</Text> : null}
    <Text style={s.badge}>{day.date}{day.effective === false ? ` · ${t('Đã thay bằng kế hoạch khác')}` : ''}</Text>
    {activity ? <View style={{ gap: 10 }}>
      {activity.focus ? <Text style={s.text}>{activity.focus}</Text> : null}
      {activity.intensity ? <Text style={s.badge}>{t('Cường độ: {level}', { level: t(activity.intensity === 'EASY' ? 'Nhẹ' : 'Vừa phải') })}</Text> : null}
      <Text style={s.title}>{activity.sport === 'YOGA' ? t('Yoga') : t('Đi bộ')} · {activity.time} · {t('{minutes} phút', { minutes: activity.plannedMinutes })}</Text>
      {status ? <Text style={s.badge}>{t(status === 'COMPLETED' ? 'Đã hoàn thành' : status === 'SKIPPED' ? 'Đã bỏ qua' : status === 'MISSED' ? 'Đã bỏ lỡ' : 'Theo kế hoạch')}</Text> : null}
      {activity.steps.map((step, i) => <Text key={i} style={s.muted}>{i + 1}. {locale === 'en' ? step.en : step.vi} · {t('{minutes} phút', { minutes: step.minutes })}</Text>)}
      {canLog ? <>
        <TextField label={t('Thời lượng thực tế (phút)')} value={minutes} onChangeText={setMinutes} keyboardType='number-pad' />
        <TextField label={t('Ghi chú hoạt động')} value={note} onChangeText={setNote} maxLength={500} multiline />
        <ErrorBanner message={error} />
        <Button title={t(status === 'COMPLETED' ? 'Cập nhật hoạt động' : 'Hoàn thành hoạt động')} onPress={() => save('COMPLETED')} loading={busy} />
        <Button title={t('Bỏ qua hoạt động')} variant='secondary' onPress={() => save('SKIPPED')} disabled={busy} />
      </> : null}
      {activity.actualMinutes ? <Text style={s.muted}>{t('Đã ghi {minutes} phút', { minutes: activity.actualMinutes })}</Text> : null}
    </View> : <Text style={s.text}>{t('Ngày nghỉ')}</Text>}
    <Text style={s.muted}>{t('Bữa đề xuất chưa phải bữa đã ăn. Xác nhận Ghi món để cập nhật Dinh dưỡng.')}</Text>
    {day.meals.map(meal => <View key={meal.mealId} style={s.item}>
      <Text style={s.badge}>{mealLabel(meal.mealId, meals)} · {meal.time}</Text>
      {!meal.items.length ? <Text style={s.muted}>{t('Chưa có món phù hợp. Chọn món khi chỉnh bản nháp.')}</Text> : null}
      {meal.items.map(item => <View key={item.id} style={{ gap: 8 }}>
        <Text style={s.text}>{item.foodName} · {formatServing(item.quantity, item.servingUnit)}</Text>
        <MacroChips values={item} />
        {item.logId ? <Button title={t('Đã ghi vào nhật ký')} variant='secondary' onPress={async () => { await useNutritionStore.getState().load(day.date); router.push('/nutrition'); }} /> : canLog ?
          <Button title={t('Ghi món')} onPress={() => router.push({ pathname: '/food/add', params: { foodId: item.foodId, mealType: meal.mealId, date: day.date, quantity: String(item.quantity), planId: plan.id, planItemId: item.id } })} /> : null}
      </View>)}
    </View>)}
    <Text style={s.text}>{t('Tổng dinh dưỡng dự kiến')}</Text><MacroChips values={day.totals} />
    <Text style={s.muted}>{t('Chênh lệch với target: {calories} kcal · {protein} g protein · {carbs} g carbs · {fat} g fat', { calories: Math.round(day.totals.calories - plan.targetSnapshot.calories), protein: Math.round(day.totals.protein - plan.targetSnapshot.protein), carbs: Math.round(day.totals.carbs - plan.targetSnapshot.carbs), fat: Math.round(day.totals.fat - plan.targetSnapshot.fat) })}</Text>
  </Card>;
}
