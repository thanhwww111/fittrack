import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { personalPlanApi } from '@/api/personalPlanApi';
import { foodApi } from '@/api/foodApi';
import { ApiError } from '@/api/client';
import { usePersonalPlanStore } from '@/stores/personalPlanStore';
import HistoryScreen from '@/app/plan/history';
import DraftScreen from '@/app/plan/draft';
import AddFoodScreen from '@/app/food/add';
import { clearAllFormDrafts } from '@/hooks/useDraftState';
import type { PersonalPlan } from '@/types/personalPlan';
import type { Food } from '@/types/models';
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), dismissTo: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => mockParams, useFocusEffect: (cb: () => void) => { const React = jest.requireActual('react'); React.useEffect(cb, [cb]); } }));
jest.mock('@/api/personalPlanApi', () => ({ personalPlanApi: { historyPlan: jest.fn(), draft: jest.fn(), editDraft: jest.fn(), apply: jest.fn(), logItem: jest.fn() } }));
jest.mock('@/api/foodApi', () => ({ foodApi: { get: jest.fn(), favorites: jest.fn() } }));
jest.mock('@/stores/notificationStore', () => ({ useNotificationStore: { getState: () => ({ refreshNutritionReminders: jest.fn() }) } }));
const plan: PersonalPlan = { id: 'p', revision: 0, state: 'DRAFT', startDate: '2026-10-06', endDate: '2026-10-12', timezone: 'Asia/Ho_Chi_Minh', sourceSurveyRevision: 1,
  surveySnapshot: { revision: 1, sport: 'YOGA', experience: 'BEGINNER', availableDays: [{ dayOfWeek: 2, time: '18:00', durationMinutes: 30 }], mealTimes: [], preferredFoodIds: [], excludedFoodIds: [], remindersEnabled: false },
  targetSnapshot: { id: 't', effectiveFrom: '2026-10-06', calories: 1800, protein: 100, carbs: 200, fat: 60 },
  days: [{ date: '2026-10-06', effective: true, activity: { id: 'a', sport: 'YOGA', time: '18:00', plannedMinutes: 30, steps: [], status: 'MISSED', revision: 0 }, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } }],
};
it('shows AI rationale, daily guidance, focus and intensity before applying', async () => {
  mockParams = { id: 'p' };
  jest.mocked(personalPlanApi.draft).mockResolvedValue({ ...plan, coachSummary: 'Recovery rationale', days: [{ ...plan.days[0], coachNote: 'Daily guidance', activity: { ...plan.days[0].activity!, focus: 'Gentle mobility', intensity: 'EASY' } }] });
  await render(<DraftScreen />);
  expect(await screen.findByText('Recovery rationale')).toBeTruthy();
  expect(screen.getByText('Daily guidance')).toBeTruthy();
  expect(screen.getByText('Gentle mobility')).toBeTruthy();
  expect(screen.getByText('Cường độ: Nhẹ')).toBeTruthy();
  expect(personalPlanApi.apply).not.toHaveBeenCalled();
});
const food: Food = { id: 'f', name: 'Rice', servingSize: 100, servingUnit: 'g', calories: 200, protein: 5, carbs: 30, fat: 2, fiber: 1, isCustom: false, createdBy: null };
beforeEach(() => { jest.clearAllMocks(); clearAllFormDrafts(); usePersonalPlanStore.setState({ data: { today: '2026-10-07', date: '2026-10-07', timezone: plan.timezone, current: null, pending: null, expired: false } }); });
it('permits backfilling a historical activity on a still-effective past date', async () => {
  mockParams = { id: 'p' }; jest.mocked(personalPlanApi.historyPlan).mockResolvedValue({ ...plan, state: 'PUBLISHED' });
  await render(<HistoryScreen />);
  expect(await screen.findByText('Hoàn thành hoạt động')).toBeTruthy();
});
it('restores accurate portion previews after clearing and correcting quantity', async () => {
  mockParams = { id: 'p' };
  const value = { ...plan, days: [{ ...plan.days[0], meals: [{ mealId: 'BREAKFAST' as const, time: '07:00', items: [{ id: 'i', foodId: 'f', foodName: 'Rice', servingUnit: 'g' as const, quantity: 100, calories: 200, protein: 5, carbs: 30, fat: 2, fiber: 1, foodVersion: '["Rice",100,"g",200,5,30,2,1]' }] }] }] };
  jest.mocked(personalPlanApi.draft).mockResolvedValue(value);
  await render(<DraftScreen />);
  const input = await screen.findByLabelText('Khẩu phần kế hoạch');
  await fireEvent.changeText(input, '');
  await fireEvent.changeText(screen.getByLabelText('Khẩu phần kế hoạch'), '150');
  expect(screen.getAllByText('300 kcal')).toHaveLength(2);
});
it('offers revalidation of unchanged draft snapshots after food updates', async () => {
  mockParams = { id: 'p' }; jest.mocked(personalPlanApi.draft).mockResolvedValue(plan);
  jest.mocked(personalPlanApi.editDraft).mockResolvedValue({ ...plan, revision: 1 });
  await render(<DraftScreen />);
  await screen.findByText('Lưu chỉnh sửa');
  await fireEvent.press(screen.getByText('Lưu chỉnh sửa'));
  await waitFor(() => expect(personalPlanApi.editDraft).toHaveBeenCalledWith('p', 0, plan.days));
});
it('prefills planned quantity and offers renewed preview after a food version conflict', async () => {
  mockParams = { foodId: 'f', mealType: 'BREAKFAST', date: '2026-10-06', quantity: '150', planId: 'p', planItemId: 'i' };
  jest.mocked(foodApi.get).mockResolvedValueOnce(food).mockResolvedValueOnce({ ...food, calories: 250 });
  jest.mocked(foodApi.favorites).mockResolvedValue([]);
  jest.mocked(personalPlanApi.logItem).mockRejectedValueOnce(new ApiError('Food changed; review nutrition and confirm again', 409));
  await render(<AddFoodScreen />);
  await screen.findByText('Thêm vào nhật ký');
  await fireEvent.press(screen.getByText('Thêm vào nhật ký'));
  await waitFor(() => expect(personalPlanApi.logItem).toHaveBeenCalledWith('p', 'i', { quantity: 150, mealType: 'BREAKFAST', foodVersion: '["Rice",100,"g",200,5,30,2,1]' }));
  await fireEvent.press(await screen.findByText('Tải lại món'));
  await waitFor(() => expect(screen.getByText('375 kcal')).toBeTruthy());
});
