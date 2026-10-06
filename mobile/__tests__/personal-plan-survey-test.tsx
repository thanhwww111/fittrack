import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import SurveyScreen from '@/app/plan/survey';
import { personalPlanApi } from '@/api/personalPlanApi';
import { mealApi } from '@/api/nutritionApi';
import { useMealStore } from '@/stores/mealStore';
import { DEFAULT_MEALS } from '@/lib/nutrition';
import { clearAllFormDrafts } from '@/hooks/useDraftState';
import type { LifestyleSurvey } from '@/types/personalPlan';
import { ApiError } from '@/api/client';

const mockSurveyParams: { sport?: string; selectionId?: string } = {};
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => mockSurveyParams }));
jest.mock('@/api/personalPlanApi', () => ({ personalPlanApi: { survey: jest.fn(), saveSurvey: jest.fn(), createDraft: jest.fn() } }));
jest.mock('@/api/nutritionApi', () => ({ mealApi: { list: jest.fn(), create: jest.fn() } }));
jest.mock('@/api/foodApi', () => ({ foodApi: { get: jest.fn() } }));
jest.mock('@/stores/personalPlanStore', () => ({ usePersonalPlanStore: { getState: () => ({ load: jest.fn().mockResolvedValue(undefined) }) } }));

const primaryMeals = [{ mealId: 'BREAKFAST' as const, time: '07:00' }, { mealId: 'LUNCH' as const, time: '12:00' }, { mealId: 'DINNER' as const, time: '19:00' }];
const savedSurvey: LifestyleSurvey = { revision: 2, sport: 'YOGA', experience: 'BEGINNER', availableDays: [{ dayOfWeek: 1, time: '18:00', durationMinutes: 30 }], mealTimes: primaryMeals, preferredFoodIds: [], excludedFoodIds: [], remindersEnabled: false };
beforeEach(() => {
  jest.clearAllMocks(); clearAllFormDrafts(); useMealStore.getState().reset(); delete mockSurveyParams.sport; delete mockSurveyParams.selectionId;
  jest.mocked(mealApi.list).mockResolvedValue(DEFAULT_MEALS);
  jest.mocked(personalPlanApi.survey).mockResolvedValue(null);
  jest.mocked(personalPlanApi.saveSurvey).mockImplementation(async value => ({ ...value, revision: value.revision + 1 }));
});

it('carries the selected onboarding sport into the survey', async () => {
  mockSurveyParams.sport = 'WALKING';
  await render(<SurveyScreen />); await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenCalledWith(expect.objectContaining({ sport: 'WALKING' })));
});
it('consumes the sport seed once, preserves later edits on remount and accepts a new explicit selection', async () => {
  mockSurveyParams.sport = 'WALKING'; mockSurveyParams.selectionId = 'first-selection';
  const view = await render(<SurveyScreen key='light' />); await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Yoga'));
  await view.rerender(<SurveyScreen key='dark' />); await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenLastCalledWith(expect.objectContaining({ sport: 'YOGA' })));
  mockSurveyParams.selectionId = 'new-selection';
  await view.rerender(<SurveyScreen key='new-entry' />); await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenLastCalledWith(expect.objectContaining({ sport: 'WALKING' })));
});
it('ignores unsupported onboarding sport parameters', async () => {
  mockSurveyParams.sport = 'RUNNING';
  await render(<SurveyScreen />); await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenCalledWith(expect.objectContaining({ sport: 'YOGA' })));
});
it('keeps three required meals and saves without optional meals', async () => {
  await render(<SurveyScreen />);
  await screen.findByLabelText('Bữa sáng (HH:mm)');
  expect(screen.queryByLabelText('Bỏ Bữa sáng')).toBeNull();
  expect(screen.getByRole('button', { name: 'Lưu khảo sát' })).toBeEnabled();
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenCalledWith(expect.objectContaining({ mealTimes: primaryMeals })));
});

it('adds and removes optional meals and shares newly named meals with nutrition', async () => {
  jest.mocked(mealApi.create).mockResolvedValue({ id: 'CUSTOM_123456789012345678901234', name: 'Bữa vặt', isCustom: true });
  await render(<SurveyScreen />);
  await fireEvent.press(await screen.findByRole('checkbox', { name: 'Ăn vặt' }));
  expect(screen.getByLabelText('Ăn vặt (HH:mm)')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bỏ Ăn vặt'));
  expect(screen.queryByLabelText('Ăn vặt (HH:mm)')).toBeNull();
  await fireEvent.press(screen.getByText('+ Thêm bữa tùy chọn'));
  await fireEvent.changeText(screen.getByLabelText('Tên bữa mới'), 'Bữa vặt');
  await fireEvent.press(screen.getByText('Lưu bữa'));
  await screen.findByLabelText('Bữa vặt (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenCalledWith(expect.objectContaining({ mealTimes: [...primaryMeals, { mealId: 'CUSTOM_123456789012345678901234', time: '15:00' }] })));
});

it('disables both save actions for invalid selected times and enables them after correction', async () => {
  await render(<SurveyScreen />);
  await fireEvent.changeText(await screen.findByLabelText('Bữa sáng (HH:mm)'), '');
  expect(screen.getByRole('button', { name: 'Lưu khảo sát' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Lưu và tạo bản nháp' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Bữa sáng (HH:mm)'), '07:30');
  expect(screen.getByRole('button', { name: 'Lưu khảo sát' })).toBeEnabled();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Ăn vặt' }));
  await fireEvent.changeText(screen.getByLabelText('Ăn vặt (HH:mm)'), '25:00');
  expect(screen.getByRole('button', { name: 'Lưu khảo sát' })).toBeDisabled();
  await fireEvent.press(screen.getByLabelText('Bỏ Ăn vặt'));
  expect(screen.getByRole('button', { name: 'Lưu khảo sát' })).toBeEnabled();
});

it('restores missing required meals in older surveys without losing optional times', async () => {
  jest.mocked(personalPlanApi.survey).mockResolvedValue({ ...savedSurvey, mealTimes: [{ mealId: 'SNACK', time: '16:00' }] });
  await render(<SurveyScreen />);
  await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenCalledWith(expect.objectContaining({ revision: 2, mealTimes: [...primaryMeals, { mealId: 'SNACK', time: '16:00' }] })));
});

it('allows saving the survey when an optional new meal name is left empty', async () => {
  await render(<SurveyScreen />);
  await fireEvent.press(await screen.findByText('+ Thêm bữa tùy chọn'));
  expect(screen.getByLabelText('Tên bữa mới').props.value).toBe('');
  await fireEvent.press(screen.getByText('Lưu khảo sát'));
  await waitFor(() => expect(personalPlanApi.saveSurvey).toHaveBeenCalledWith(expect.objectContaining({ mealTimes: primaryMeals })));
  expect(mealApi.create).not.toHaveBeenCalled();
});
it('retains generation identity after a timeout and explicitly starts fresh after terminal failure', async () => {
  jest.mocked(personalPlanApi.createDraft).mockRejectedValueOnce(new ApiError('Request timed out')).mockRejectedValueOnce(new ApiError('AI failed', 502, { code: 'PLAN_GENERATION_FAILED' })).mockResolvedValue({ id: 'draft' } as any);
  await render(<SurveyScreen />); await screen.findByLabelText('Bữa sáng (HH:mm)');
  await fireEvent.press(screen.getByText('Lưu và tạo bản nháp'));
  await screen.findByText('Server phản hồi quá lâu, thử lại sau.');
  expect(screen.queryByText('Bắt đầu yêu cầu AI mới')).toBeNull();
  await fireEvent.press(screen.getByText('Lưu và tạo bản nháp'));
  await fireEvent.press(await screen.findByText('Bắt đầu yêu cầu AI mới'));
  await fireEvent.press(screen.getByText('Lưu và tạo bản nháp'));
  await waitFor(() => expect(personalPlanApi.createDraft).toHaveBeenCalledTimes(3));
  const calls = jest.mocked(personalPlanApi.createDraft).mock.calls;
  expect(calls[0][0]).toBe(calls[1][0]); expect(calls[1][0]).not.toBe(calls[2][0]);
  expect(personalPlanApi.saveSurvey).toHaveBeenCalledTimes(1);
});
