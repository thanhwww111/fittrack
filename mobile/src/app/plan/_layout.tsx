import { Stack } from 'expo-router';
import { useTranslation } from '@/i18n';
import { PlanHeader } from '@/components/plan/PlanHeader';
import { colors } from '@/constants/theme';
export default function PlanLayout() {
  const { t } = useTranslation();
  return <Stack screenOptions={{ headerShown: true, header: ({ options }) => <PlanHeader title={options.title ?? t('Kế hoạch')} />, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name='coach' options={{ title: t('PT AI của bạn') }} />
    <Stack.Screen name='survey' options={{ title: t('Khảo sát sinh hoạt') }} />
    <Stack.Screen name='draft' options={{ title: t('Bản nháp kế hoạch') }} />
    <Stack.Screen name='history' options={{ title: t('Lịch sử kế hoạch') }} />
  </Stack>;
}
