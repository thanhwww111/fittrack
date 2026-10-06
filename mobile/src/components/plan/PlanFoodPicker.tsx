import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { foodApi } from '@/api/foodApi';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useTranslation } from '@/i18n';
import { errorMessage } from '@/lib/formErrors';
import { colors } from '@/constants/theme';
import type { Food } from '@/types/models';
import { planStyles as s } from './planStyles';
export function PlanFoodPicker({ onSelect, excluded = [], onClose }: { onSelect: (food: Food) => void; excluded?: string[]; onClose: () => void }) {
  const { t } = useTranslation(); const [query, setQuery] = useState(''); const [foods, setFoods] = useState<Food[]>([]);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { setLoading(true); setError(null); void foodApi.search({ search: query, limit: 30 }).then(r => { if (active) setFoods(r.items); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return <View style={s.item}>
    <TextField label={t('Tìm món cho kế hoạch')} value={query} onChangeText={setQuery} />
    <ErrorBanner message={error} />{loading ? <ActivityIndicator color={colors.primary} /> : null}
    {!loading && !foods.length ? <Text style={s.muted}>{t('Không có món phù hợp.')}</Text> : null}
    {foods.filter(f => !excluded.includes(f.id)).map(food => <Button key={food.id} title={`${food.name} · ${food.calories} kcal`} variant='secondary' onPress={() => onSelect(food)} />)}
    <Button title={t('Đóng')} variant='secondary' onPress={onClose} />
  </View>;
}
