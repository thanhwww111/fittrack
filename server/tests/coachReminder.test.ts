import { describe, expect, it } from 'vitest';
import { activityReminder } from '../src/services/coachReminder';

describe('personalized coach activity reminder', () => {
  const activity = { sport: 'WALKING' as const, time: '18:30', plannedMinutes: 25, focus: 'Đi nhẹ, chú ý nhịp thở' };
  it('reminds using the actual activity time, duration and AI focus', () => {
    const text = activityReminder('BEFORE', activity, 'vi', 'FIRM');
    expect(text).toContain('18:30');
    expect(text).toContain('25 phút');
    expect(text).toContain('Đi nhẹ, chú ý nhịp thở');
    expect(text).toContain('Đi bộ');
  });
  it('does not claim an overdue activity was missed and bounds generated focus', () => {
    const text = activityReminder('OVERDUE', { ...activity, focus: 'x'.repeat(2000) }, 'en', 'GENTLE')!;
    expect(text).toContain('unconfirmed');
    expect(text).not.toContain('missed');
    expect(text.length).toBeLessThan(400);
    expect(activityReminder('DAILY', activity, 'vi', 'FIRM')).toBeUndefined();
    expect(activityReminder('BEFORE', null, 'vi', 'FIRM')).toBeUndefined();
  });
});
