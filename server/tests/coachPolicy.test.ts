import { describe, it, expect } from 'vitest';
import { coachSettingsSchema } from '../src/schemas/coach.schema';
import { pushAllowed, localClock } from '../src/services/coachPolicy';
describe('coach policy', () => {
  it('defaults to opt out and rejects unsupported caps', () => {
    expect(coachSettingsSchema.parse({})).toMatchObject({ enabled: false, maxPerDay: 3, quietStart: '22:00', quietEnd: '07:00' });
    expect(coachSettingsSchema.safeParse({ maxPerDay: 4 }).success).toBe(false);
  });
  it('uses profile timezone for overnight quiet hours and snooze', () => {
    const settings = coachSettingsSchema.parse({ enabled: true });
    const night = new Date('2026-10-05T16:00:00Z');
    expect(localClock(night, 'Asia/Ho_Chi_Minh').time).toBe('23:00');
    expect(pushAllowed(settings, night, 'Asia/Ho_Chi_Minh')).toBe(false);
    expect(pushAllowed(settings, new Date('2026-10-06T05:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe(true);
    expect(pushAllowed({ ...settings, snoozedUntil: '2026-10-07T00:00:00Z' }, new Date('2026-10-06T05:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe(false);
  });
});
