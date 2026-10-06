import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View, Switch, ActivityIndicator } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import { router, useLocalSearchParams } from 'expo-router';
import { OTHER_ACTIVITY_OPTIONS, isOtherActivity } from '@/constants/otherActivities';
import { personalPlanApi } from '@/api/personalPlanApi';
import { foodApi } from '@/api/foodApi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/TextField';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PlanFoodPicker } from '@/components/plan/PlanFoodPicker';
import { planStyles as s } from '@/components/plan/planStyles';
import { useTranslation } from '@/i18n';
import { useDraftState, clearFormDrafts, getFormDraft } from '@/hooks/useDraftState';
import { useAuthStore } from '@/stores/authStore';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import { errorMessage } from '@/lib/formErrors';
import { isFailedPlanGeneration } from '@/lib/planGeneration';
import { newPlanRequestId } from '@/lib/personalPlan';
import { mealLabel } from '@/lib/nutrition';
import { useMeals } from '@/hooks/useMeals';
import { AddMealForm } from '@/components/nutrition/AddMealForm';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MealType } from '@/types/models';
import { colors } from '@/constants/theme';
import type { LifestyleSurvey } from '@/types/personalPlan';
const defaults: LifestyleSurvey = { revision: 0, sport: 'YOGA', experience: 'BEGINNER', availableDays: [1, 3, 5].map(dayOfWeek => ({ dayOfWeek, time: '18:00', durationMinutes: 30 })), mealTimes: [{ mealId: 'BREAKFAST', time: '07:00' }, { mealId: 'LUNCH', time: '12:00' }, { mealId: 'DINNER', time: '19:00' }], preferredFoodIds: [], excludedFoodIds: [], remindersEnabled: false };
const primaryMealIds: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER'];
function withPrimaryMeals(value: LifestyleSurvey): LifestyleSurvey {
  return { ...value, mealTimes: [...defaults.mealTimes.map(meal => value.mealTimes.find(saved => saved.mealId === meal.mealId) ?? meal), ...value.mealTimes.filter(meal => !primaryMealIds.includes(meal.mealId))] };
}
export default function SurveyScreen() {
  const { t, localeTag } = useTranslation();
  const { sport: sportParam, selectionId } = useLocalSearchParams<{ sport?: string; selectionId?: string }>();
  const requestedSport = isOtherActivity(sportParam) ? sportParam : undefined;
  const sportSeed = requestedSport ? `${typeof selectionId === 'string' ? selectionId.slice(0, 120) : 'initial'}:${requestedSport}` : null;
  const { meals, error: mealError } = useMeals();
  const weekdayLabel = (day: number) => new Intl.DateTimeFormat(localeTag, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 4 + day)));
  const userId = useAuthStore(s => s.user?.id);
  const key = `survey-${userId}`;
  const [survey, setSurvey] = useDraftState<LifestyleSurvey | null>(key, null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<'preferredFoodIds' | 'excludedFoodIds' | null>(null);
  const [foodNames, setFoodNames] = useState<Record<string, string>>({});
  const [requestId, setRequestId] = useDraftState(key + '-request', newPlanRequestId());
  const [saved, setSaved] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [, setSportSeed] = useDraftState<string | null>(key + '-sport-seed', null);
  const initializeSurvey = useCallback((value: LifestyleSurvey | null) => {
    const shouldSeed = !!requestedSport && !!sportSeed && getFormDraft<string | null>(key + '-sport-seed', null) !== sportSeed;
    setSurvey(previous => { const initial = withPrimaryMeals(previous ?? value ?? defaults); return shouldSeed ? { ...initial, sport: requestedSport! } : initial; });
    if (shouldSeed) setSportSeed(sportSeed);
  }, [key, requestedSport, sportSeed, setSurvey, setSportSeed]);
  useEffect(() => {
    let active = true;
    void personalPlanApi.survey().then(value => { if (active) initializeSurvey(value); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initializeSurvey]);
  useEffect(() => {
    let active = true;
    void Promise.all([...(survey?.preferredFoodIds ?? []), ...(survey?.excludedFoodIds ?? [])].map(async id => {
      try { const food = await foodApi.get(id); if (active) setFoodNames(prev => ({ ...prev, [id]: food.name })); } catch { /* deleted selections remain removable */ }
    }));
    return () => { active = false; };
  }, [survey?.preferredFoodIds, survey?.excludedFoodIds]);
  function change(patch: Partial<LifestyleSurvey>) { if (busy) return; setSurvey(prev => prev ? { ...prev, ...patch } : prev); setSaved(false); setRequestId(newPlanRequestId()); setGenerationFailed(false); }
  function addMeal(mealId: MealType) {
    setSurvey(previous => previous && previous.mealTimes.length < 8 && !previous.mealTimes.some(meal => meal.mealId === mealId) ? { ...previous, mealTimes: [...previous.mealTimes, { mealId, time: '15:00' }] } : previous);
    setSaved(false); setRequestId(newPlanRequestId());
  }
  const valid = !!survey && survey.availableDays.length > 0 && survey.availableDays.every(day => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(day.time) && Number.isInteger(day.durationMinutes) && day.durationMinutes >= 10 && day.durationMinutes <= 90) && primaryMealIds.every(id => survey.mealTimes.some(meal => meal.mealId === id)) && survey.mealTimes.every(meal => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(meal.time));
  async function save(create: boolean) {
    if (busy) return;
    if (!survey) return;
    if (!valid) { setError(t('Chọn ngày rảnh, giờ HH:mm và thời lượng từ 10 đến 90 phút.')); return; }
    setBusy(true); setError(null);
    try {
      if (!saved) { const next = await personalPlanApi.saveSurvey(survey); setSurvey(next); setSaved(true); }
      await usePersonalPlanStore.getState().load();
      if (create) {
        setGenerating(true); setRequestId(requestId);
        const draft = await personalPlanApi.createDraft(requestId); clearFormDrafts(key);
        router.replace({ pathname: '/plan/draft', params: { id: draft.id } });
      }
    } catch (e) { setError(errorMessage(e)); if (create && isFailedPlanGeneration(e)) setGenerationFailed(true); }
    finally { setBusy(false); setGenerating(false); }
  }
  if (!survey) return <View style={s.content}>{loading ? <ActivityIndicator color={colors.primary} /> : null}<ErrorBanner message={error} /><Button title={t('Thử lại')} onPress={() => { setLoading(true); void personalPlanApi.survey().then(initializeSurvey).catch(e => setError(errorMessage(e))).finally(() => setLoading(false)); }} /></View>;
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps='handled'>
    <Button title={t('PT AI của bạn')} variant='secondary' onPress={() => router.push('/plan/coach')} />
    <Card title={t('Lịch sinh hoạt của bạn')}>
      <Text style={s.muted}>{t('Mục tiêu và target dùng từ hồ sơ hiện tại. Chọn một môn cho kế hoạch 7 ngày.')}</Text>
      <ChipGroup label={t('Môn chính')} value={survey.sport} onChange={sport => change({ sport })} options={OTHER_ACTIVITY_OPTIONS.map(option => ({ ...option, label: t(option.label) }))} />
      <ChipGroup label={t('Kinh nghiệm')} value={survey.experience} onChange={experience => change({ experience })} options={[{ value: 'BEGINNER', label: t('Mới bắt đầu') }, { value: 'REGULAR', label: t('Đã tập thường xuyên') }]} />
      <Text style={s.text}>{t('Chọn ngày rảnh')}</Text><View style={s.chips}>
        {Array.from({ length: 7 }, (_, i) => i + 1).map(day => {
          const selected = survey.availableDays.some(d => d.dayOfWeek === day);
          return <Pressable key={day} accessibilityRole='checkbox' accessibilityState={{ checked: selected }} accessibilityLabel={weekdayLabel(day)} style={[s.chip, selected && s.selected]} onPress={() => change({ availableDays: selected ? survey.availableDays.filter(d => d.dayOfWeek !== day) : [...survey.availableDays, { dayOfWeek: day, time: '18:00', durationMinutes: 30 }].sort((a, b) => a.dayOfWeek - b.dayOfWeek) })}>
            <Text style={selected ? s.badge : s.text}>{weekdayLabel(day)}</Text>
          </Pressable>;
        })}
      </View>
      {survey.availableDays.map(slot => <View key={slot.dayOfWeek} style={s.item}>
        <Text style={s.badge}>{weekdayLabel(slot.dayOfWeek)}</Text>
        <TextField label={t('Giờ tập (HH:mm)')} value={slot.time} onChangeText={time => change({ availableDays: survey.availableDays.map(d => d.dayOfWeek === slot.dayOfWeek ? { ...d, time } : d) })} />
        <Text style={s.text}>{t('Số phút có thể tập')}</Text>
        <NumberStepper label={t('Số phút có thể tập')} value={String(slot.durationMinutes)} min={10} max={90} onChangeText={value => change({ availableDays: survey.availableDays.map(d => d.dayOfWeek === slot.dayOfWeek ? { ...d, durationMinutes: Number(value) } : d) })} />
      </View>)}
      <View style={s.row}><Text style={s.text}>{t('Nhắc hoạt động theo kế hoạch')}</Text><Switch accessibilityLabel={t('Nhắc hoạt động theo kế hoạch')} value={survey.remindersEnabled} onValueChange={remindersEnabled => change({ remindersEnabled })} /></View>
    </Card>
    <Card title={t('Bữa ăn và món ưu tiên')}>
      <Text style={s.muted}>{t('Ba bữa chính luôn được giữ. Bữa phụ là tùy chọn.')}</Text>
      {survey.mealTimes.map((meal, index) => <View key={meal.mealId} style={s.mealRow}>
        <View style={s.flex}><TextField label={`${mealLabel(meal.mealId, meals)} (HH:mm)`} value={meal.time} editable={!busy} placeholder='HH:mm' onChangeText={time => change({ mealTimes: survey.mealTimes.map((m, i) => i === index ? { ...m, time } : m) })} /></View>
        {!primaryMealIds.includes(meal.mealId) ? <Pressable accessibilityRole='button' accessibilityLabel={t('Bỏ {meal}', { meal: mealLabel(meal.mealId, meals) })} hitSlop={4} disabled={busy} style={s.removeMeal} onPress={() => change({ mealTimes: survey.mealTimes.filter(m => m.mealId !== meal.mealId) })}><Ionicons name='close' size={18} color={colors.textMuted} /></Pressable> : null}
      </View>)}
      <Text style={s.badge}>{t('Bữa phụ (không bắt buộc)')}</Text>
      <View style={s.chips}>{meals.filter(meal => !primaryMealIds.includes(meal.id)).map(meal => {
        const selected = survey.mealTimes.some(slot => slot.mealId === meal.id);
        const disabled = busy || (!selected && survey.mealTimes.length >= 8);
        return <Pressable key={meal.id} accessibilityRole='checkbox' accessibilityLabel={meal.name} accessibilityState={{ checked: selected, disabled }} disabled={disabled} style={[s.chip, selected && s.selected]} onPress={() => selected ? change({ mealTimes: survey.mealTimes.filter(slot => slot.mealId !== meal.id) }) : addMeal(meal.id)}><View style={s.row}><Ionicons name={selected ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={colors.primaryText} /><Text style={s.text}>{meal.name}</Text></View></Pressable>;
      })}</View>
      {survey.mealTimes.length < 8 && !busy ? <AddMealForm onAdded={addMeal} /> : null}
      {survey.mealTimes.length >= 8 ? <Text style={s.muted}>{t('Tối đa 8 bữa mỗi ngày, gồm 3 bữa chính.')}</Text> : null}
      <ErrorBanner message={mealError} />
      <Text style={s.muted}>{t('Món muốn tránh là lựa chọn cá nhân; dữ liệu hiện có không bảo đảm kiểm tra dị ứng.')}</Text>
      {(['preferredFoodIds', 'excludedFoodIds'] as const).map(field => <View key={field} style={{ gap: 8 }}>
        <Button title={t(field === 'preferredFoodIds' ? 'Thêm món yêu thích' : 'Thêm món muốn tránh')} variant='secondary' onPress={() => setPicker(field)} />
        {survey[field].map(id => <Button key={id} title={`${foodNames[id] ?? t('Món đã chọn')} · ${t('Bỏ chọn')}`} variant='secondary' onPress={() => change({ [field]: survey[field].filter(f => f !== id) })} />)}
      </View>)}
      {picker ? <PlanFoodPicker onClose={() => setPicker(null)} onSelect={food => { setFoodNames(prev => ({ ...prev, [food.id]: food.name })); change({ [picker]: [...new Set([...survey[picker], food.id])], [picker === 'preferredFoodIds' ? 'excludedFoodIds' : 'preferredFoodIds']: survey[picker === 'preferredFoodIds' ? 'excludedFoodIds' : 'preferredFoodIds'].filter(id => id !== food.id) }); setPicker(null); }} /> : null}
    </Card>
    <ErrorBanner message={error} />{error ? <Button title={t("Tải lại khảo sát")} variant="secondary" onPress={async () => { try { setSurvey(withPrimaryMeals(await personalPlanApi.survey() ?? defaults)); setSaved(false); setError(null); } catch (e) { setError(errorMessage(e)); } }} /> : null}{saved ? <Text style={s.badge}>{t('Đã lưu khảo sát.')}</Text> : null}
    {!valid ? <Text style={s.error}>{t('Điền giờ HH:mm cho các bữa đã chọn, chọn ngày rảnh và thời lượng 10–90 phút để lưu.')}</Text> : null}
    {generating ? <Text style={s.muted}>{t('Đang xử lý yêu cầu AI. Vui lòng chờ; thử lại sau lỗi mạng sẽ dùng cùng yêu cầu.')}</Text> : null}
    {generationFailed ? <Button title={t('Bắt đầu yêu cầu AI mới')} variant='secondary' disabled={busy} onPress={() => { setRequestId(newPlanRequestId()); setGenerationFailed(false); setError(null); }} /> : null}
    <Button title={t('Lưu khảo sát')} disabled={!valid} variant='secondary' onPress={() => save(false)} loading={busy} />
    <Button title={t('Lưu và tạo bản nháp')} disabled={!valid} onPress={() => save(true)} loading={busy} />
    <Button title={t('Tiếp tục sau')} variant='secondary' onPress={() => router.dismissTo('/plan')} />
  </ScrollView>;
}
