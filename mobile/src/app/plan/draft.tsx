import { useMeals } from '@/hooks/useMeals';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { personalPlanApi } from '@/api/personalPlanApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { MacroChips } from '@/components/nutrition/MacroChips';
import { PlanFoodPicker } from '@/components/plan/PlanFoodPicker';
import { planStyles as s } from '@/components/plan/planStyles';
import { useTranslation } from '@/i18n';
import { useDraftState, clearFormDrafts } from '@/hooks/useDraftState';
import { errorMessage } from '@/lib/formErrors';
import { newPlanRequestId, foodVersion, resizePlannedItem } from '@/lib/personalPlan';
import { mealLabel, previewNutrition } from '@/lib/nutrition';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import type { PersonalPlan, PlannedItem, PlanDay } from '@/types/personalPlan';
import type { Food } from '@/types/models';
import { colors } from '@/constants/theme';
const totals = (day: PlanDay) => day.meals.flatMap(m => m.items).reduce((sum, item) => ({ calories: Math.round((sum.calories + item.calories) * 10) / 10, protein: Math.round((sum.protein + item.protein) * 10) / 10, carbs: Math.round((sum.carbs + item.carbs) * 10) / 10, fat: Math.round((sum.fat + item.fat) * 10) / 10, fiber: Math.round((sum.fiber + item.fiber) * 10) / 10 }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
export default function DraftScreen() {
  const { meals } = useMeals();
  const { t } = useTranslation(); const { id } = useLocalSearchParams<{ id: string }>();
  const key = `plan-draft-${id}`;
  const [plan, setPlan] = useDraftState<PersonalPlan | null>(key, null);
  const [savedDays, setSavedDays] = useState('');
  const [requestId, setRequestId] = useDraftState(key + '-apply', newPlanRequestId());
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(!!id);
  const [picker, setPicker] = useState<{ day: number; meal: number; item: number } | null>(null);
  useEffect(() => {
    let active = true;
    if (!id) return;
    void personalPlanApi.draft(id).then(value => { if (active) { setPlan(prev => prev?.revision === value.revision ? prev : value); setSavedDays(JSON.stringify(value.days)); } }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, setPlan]);
  const dirty = !!plan && JSON.stringify(plan.days) !== savedDays;
  function updateDay(index: number, update: (day: PlanDay) => PlanDay) {
    setPlan(prev => prev ? { ...prev, days: prev.days.map((day, i) => { if (i !== index) return day; const next = update(day); return { ...next, totals: totals(next) }; }) } : prev);
  }
  function chooseFood(food: Food) {
    if (!picker) return;
    const { day, meal, item } = picker;
    updateDay(day, d => ({ ...d, meals: d.meals.map((m, i) => i !== meal ? m : { ...m, items: (() => {
      const old = m.items[item];
      const next: PlannedItem = { id: old?.id ?? Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join(''), foodId: food.id, foodName: food.name, servingUnit: food.servingUnit, quantity: food.servingSize, foodVersion: foodVersion(food), ...previewNutrition(food, food.servingSize)! };
      return item < m.items.length ? m.items.map((value, j) => j === item ? next : value) : [...m.items, next];
    })() } ) }));
    setPicker(null);
  }
  async function save() {
    if (!plan) return; setBusy(true); setError(null);
    try { const saved = await personalPlanApi.editDraft(id, plan.revision, plan.days); setPlan(saved); setSavedDays(JSON.stringify(saved.days)); setRequestId(newPlanRequestId()); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function apply() {
    if (!plan || dirty) return; setBusy(true); setError(null);
    try { await personalPlanApi.apply(id, plan.revision, requestId); await usePersonalPlanStore.getState().load(); clearFormDrafts(key); router.dismissTo('/plan'); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  if (!plan) return <View style={s.content}>{loading ? <ActivityIndicator color={colors.primary} /> : null}<ErrorBanner message={error ?? (!id ? t('Không tìm thấy bản nháp.') : null)} /><Button title={t('Chỉnh khảo sát')} onPress={() => router.replace('/plan/survey')} /></View>;
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps='handled'>
    <Button title={t('Trao đổi với PT về kế hoạch')} variant='secondary' onPress={() => router.push('/plan/coach')} />
    <Card title={t('Xem lại trước khi áp dụng')}>
      <Text style={s.title}>{plan.startDate} → {plan.endDate}</Text>
      <Text style={s.muted}>{t('Lịch theo ngày rảnh và thời lượng bạn chọn. Ngày không tập là ngày nghỉ.')}</Text>
      <Text style={s.muted}>{t('Áp dụng có hiệu lực từ {date}. Không tự ghi bữa ăn.', { date: plan.startDate })}</Text>
      <Text style={s.muted}>{t('Target mỗi ngày')}</Text><MacroChips values={plan.targetSnapshot} />
      <Text style={s.muted}>{t('Khẩu phần là gợi ý. Kiểm tra tổng và chênh lệch target trước khi áp dụng.')}</Text>
    </Card>
    {plan.days.map((day, dayIndex) => <Card key={day.date} title={day.date}>
      {day.coachNote ? <Text style={s.muted}>{day.coachNote}</Text> : null}
      {day.activity ? <>
        {day.activity.focus ? <Text style={s.text}>{day.activity.focus}</Text> : null}
        {day.activity.intensity ? <Text style={s.badge}>{t('Cường độ: {level}', { level: t(day.activity.intensity === 'EASY' ? 'Nhẹ' : 'Vừa phải') })}</Text> : null}
        <Text style={s.badge}>{day.activity.sport === 'YOGA' ? t('Yoga') : t('Đi bộ')}</Text>
        <TextField label={t('Giờ tập (HH:mm)')} value={day.activity.time} editable={plan.state === 'DRAFT'} onChangeText={time => updateDay(dayIndex, d => ({ ...d, activity: { ...d.activity!, time } }))} />
        <NumberStepper label={t('Thời lượng dự kiến (phút)')} min={10} max={plan.surveySnapshot.availableDays.find(slot => slot.dayOfWeek === (new Date(day.date + 'T12:00:00Z').getUTCDay() || 7))?.durationMinutes ?? 90} value={String(day.activity.plannedMinutes)} disabled={plan.state !== 'DRAFT'} onChangeText={value => updateDay(dayIndex, d => ({ ...d, activity: { ...d.activity!, plannedMinutes: Number(value) } }))} />
        <Text style={s.muted}>{t('Đổi ngày rảnh trong khảo sát để tạo lại kế hoạch.')}</Text>
      </> : <Text style={s.text}>{t('Ngày nghỉ')}</Text>}
      {day.meals.map((meal, mealIndex) => <View key={meal.mealId} style={s.item}>
        <Text style={s.badge}>{mealLabel(meal.mealId, meals)}</Text>
        <TextField label={t('Giờ ăn (HH:mm)')} value={meal.time} editable={plan.state === 'DRAFT'} onChangeText={time => updateDay(dayIndex, d => ({ ...d, meals: d.meals.map((m, i) => i === mealIndex ? { ...m, time } : m) }))} />
        {meal.items.map((item, itemIndex) => <View key={item.id} style={{ gap: 8 }}>
          <Text style={s.text}>{item.foodName} · {item.servingUnit}</Text><MacroChips values={item} />
          <NumberStepper label={t('Khẩu phần kế hoạch')} value={String(item.quantity)} min={.01} max={10000} decimal positive disabled={plan.state !== 'DRAFT'} onChangeText={value => updateDay(dayIndex, d => ({ ...d, meals: d.meals.map((m, i) => i !== mealIndex ? m : { ...m, items: m.items.map((old, j) => {
            if (j !== itemIndex) return old;
            return resizePlannedItem(old, Number(value));
          }) }) }))} />
          {plan.state === 'DRAFT' ? <View style={s.row}><Button title={t('Đổi món')} variant='secondary' onPress={() => setPicker({ day: dayIndex, meal: mealIndex, item: itemIndex })} /><Button title={t('Bỏ món')} variant='secondary' onPress={() => updateDay(dayIndex, d => ({ ...d, meals: d.meals.map((m, i) => i !== mealIndex ? m : { ...m, items: m.items.filter((_, j) => j !== itemIndex) }) }))} /></View> : null}
        </View>)}
        {plan.state === 'DRAFT' && meal.items.length < 12 ? <Button title={t('Thêm món')} variant='secondary' onPress={() => setPicker({ day: dayIndex, meal: mealIndex, item: meal.items.length })} /> : null}
        {picker?.day === dayIndex && picker.meal === mealIndex ? <PlanFoodPicker excluded={plan.surveySnapshot.excludedFoodIds} onClose={() => setPicker(null)} onSelect={chooseFood} /> : null}
      </View>)}
      <MacroChips values={day.totals} /><Text style={s.muted}>{t('Chênh lệch với target: {calories} kcal · {protein} g protein · {carbs} g carbs · {fat} g fat', { calories: Math.round(day.totals.calories - plan.targetSnapshot.calories), protein: Math.round(day.totals.protein - plan.targetSnapshot.protein), carbs: Math.round(day.totals.carbs - plan.targetSnapshot.carbs), fat: Math.round(day.totals.fat - plan.targetSnapshot.fat) })}</Text>
    </Card>)}
    {plan.coachSummary ? <Card title={t('Lý do đề xuất của PT')}><Text style={s.text}>{plan.coachSummary}</Text></Card> : null}
    <ErrorBanner message={error} />
    {error ? <Button title={t('Tải lại bản nháp')} variant='secondary' onPress={async () => { setBusy(true); try { const fresh = await personalPlanApi.draft(id); setPlan(fresh); setSavedDays(JSON.stringify(fresh.days)); setError(null); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }} /> : null}
    {plan.state === 'DRAFT' ? <Button title={t('Lưu chỉnh sửa')} variant='secondary' loading={busy} onPress={save} /> : null}
    {dirty ? <Text style={s.muted}>{t('Lưu chỉnh sửa trước khi áp dụng.')}</Text> : null}
    <Button title={t('Áp dụng kế hoạch')} onPress={apply} disabled={dirty || loading} loading={busy} />
    <Button title={t('Chỉnh khảo sát')} variant='secondary' onPress={() => router.push('/plan/survey')} />
  </ScrollView>;
}
