import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlanDayCard } from '@/components/plan/PlanDayCard';
import { personalPlanApi } from '@/api/personalPlanApi';
import type { PersonalPlan, PlanDay } from '@/types/personalPlan';
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/stores/notificationStore', () => ({ useNotificationStore: { getState: () => ({ refreshNutritionReminders: jest.fn() }) } }));
jest.mock('@/api/personalPlanApi', () => ({ personalPlanApi: { logActivity: jest.fn() } }));
const day: PlanDay = { date: '2026-10-06', effective: true, activity: { id: 'a', sport: 'YOGA', time: '18:00', plannedMinutes: 30, steps: [{ vi: 'Thở nhẹ', en: 'Breathe gently', minutes: 30 }], status: 'PLANNED', revision: 0 }, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
const plan = { id: 'p', targetSnapshot: { calories: 1800, protein: 100, carbs: 200, fat: 60 } } as PersonalPlan;
it('rejects zero actual minutes before recording completion, then saves a valid duration', async () => {
  const refresh = jest.fn();
  jest.mocked(personalPlanApi.logActivity).mockResolvedValue({});
  const screen = await render(<PlanDayCard plan={plan} day={day} today={day.date} onRefresh={refresh} />);
  await fireEvent.changeText(screen.getByLabelText('Thời lượng thực tế (phút)'), '0');
  await fireEvent.press(screen.getByText('Hoàn thành hoạt động'));
  expect(screen.getByText('Nhập số phút từ 1 đến 1440.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Thời lượng thực tế (phút)'), '25');
  await fireEvent.press(screen.getByText('Hoàn thành hoạt động'));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(personalPlanApi.logActivity).toHaveBeenCalledWith('p', 'a', { revision: 0, status: 'COMPLETED', actualMinutes: 25, note: '' });
});
it('shows future plans without offering completion or recording meals', async () => {
  const screen = await render(<PlanDayCard plan={plan} day={{ ...day, date: '2026-10-07' }} today='2026-10-06' />);
  expect(screen.queryByText('Hoàn thành hoạt động')).toBeNull();
});
