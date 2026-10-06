import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackButton } from '@/components/navigation/BackButton';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), dismissTo: jest.fn() },
  usePathname: () => '/food/add',
}));
beforeEach(() => jest.clearAllMocks());

it('keeps regular screen back navigation', async () => {
  await render(<BackButton />);
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('returns to the previous form step without leaving the page when given an action', async () => {
  const previousStep = jest.fn();
  await render(<BackButton onPress={previousStep} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(previousStep).toHaveBeenCalledTimes(1);
  expect(router.back).not.toHaveBeenCalled();
});
