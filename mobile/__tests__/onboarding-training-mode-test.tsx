import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding';
import { useProfileStore } from '@/stores/profileStore';
import { router } from 'expo-router';
import { clearAllFormDrafts } from '@/hooks/useDraftState';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign((selector: any) => selector({ user: { id: 'alice', name: 'Alice' }, logout: jest.fn() }), { getState: () => ({ user: { id: 'alice' } }) }) }));
jest.mock('@/stores/trainingScheduleStore', () => ({ useTrainingScheduleStore: (selector: any) => selector({ data: null }) }));
jest.mock('@/components/workout/ScheduleSelection', () => ({ ScheduleSelection: ({ onApplied }: { onApplied: () => void }) => { const { Button } = require('react-native'); return <Button title='Apply gym schedule' onPress={onApplied} />; } }));
const mockUpdateProfile = jest.fn();
const mockSetOnboarding = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); clearAllFormDrafts();
  useProfileStore.setState({ profile: { gender: 'MALE', age: 30, height: 170, currentWeight: 70, activityLevel: 'MODERATE', goalType: 'MAINTENANCE', trainingMode: 'GYM' } as any, updateProfile: mockUpdateProfile, setOnboardingActive: mockSetOnboarding });
  mockUpdateProfile.mockImplementation(async input => useProfileStore.setState(state => ({ profile: { ...state.profile!, ...input } })));
});
it('requires an explicit mode choice and opens the gym schedule', async () => {
  await render(<OnboardingScreen />);
  expect(screen.queryByText('Apply gym schedule')).toBeNull();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Gym' }));
  await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ trainingMode: 'GYM' }));
  await fireEvent.press(await screen.findByText('Apply gym schedule'));
  expect(mockSetOnboarding).toHaveBeenLastCalledWith(false);
  expect(router.replace).not.toHaveBeenCalled();
});
it('expands other activities without saving or redirecting until a sport is selected', async () => {
  await render(<OnboardingScreen />);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hình thức vận động khác' }));
  expect(screen.getByText('Đi bộ')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Tiếp tục khảo sát' })).toBeDisabled();
  expect(mockUpdateProfile).not.toHaveBeenCalled(); expect(router.replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Đi bộ'));
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục khảo sát' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/plan/survey', params: { sport: 'WALKING', selectionId: expect.any(String) } }));
  expect(mockUpdateProfile).toHaveBeenCalledWith({ trainingMode: 'OTHER' });
});
it('can return from other activities to gym without selecting yoga automatically', async () => {
  await render(<OnboardingScreen />);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hình thức vận động khác' }));
  await fireEvent.press(screen.getByText('Yoga'));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Gym' }));
  expect(await screen.findByText('Apply gym schedule')).toBeTruthy();
  expect(screen.queryByText('Yoga')).toBeNull();
  expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
});
