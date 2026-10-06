import { useNotificationStore } from '@/stores/notificationStore';
import { notificationApi } from '@/api/notificationApi';
import { scheduleReminders } from '@/lib/notifications';
import type { NotificationSettings } from '@/types/models';
jest.mock('@/api/notificationApi', () => ({ notificationApi: { updateSettings: jest.fn(), getSettings: jest.fn() } }));
jest.mock('@/api/nutritionApi', () => ({ nutritionApi: { today: jest.fn().mockResolvedValue({ target: null, consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 } }) } }));
jest.mock('@/api/trainingScheduleApi', () => ({ trainingScheduleApi: { get: jest.fn().mockResolvedValue(null) } }));
jest.mock('@/lib/notifications', () => ({ scheduleReminders: jest.fn(), cancelReminders: jest.fn().mockResolvedValue(undefined), getPushToken: jest.fn().mockResolvedValue({ token: null, reason: 'no-project' }) }));
const settings: NotificationSettings = { workoutReminder: { enabled: true, days: [1], time: '18:00' }, mealReminders: { enabled: true, items: [{ label: 'Bữa phụ', time: '15:30' }] }, weeklyReport: true, prAlerts: true, goalAlerts: true };
beforeEach(() => { jest.clearAllMocks(); useNotificationStore.getState().reset(); jest.mocked(notificationApi.updateSettings).mockResolvedValue(settings); jest.mocked(notificationApi.getSettings).mockResolvedValue(settings); });
it('does not report a successful save when the native scheduler fails and recovers on retry', async () => {
  jest.mocked(scheduleReminders).mockRejectedValueOnce(new Error('Native notification scheduling failed')).mockResolvedValue(undefined);
  await expect(useNotificationStore.getState().update(settings)).rejects.toThrow('Native notification scheduling failed');
  expect(useNotificationStore.getState().error).toBe('Native notification scheduling failed');
  await useNotificationStore.getState().update(settings);
  expect(useNotificationStore.getState().error).toBeNull();
});
