import type { CoachSettings } from '../schemas/coach.schema';
export function localClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const v = (key: string) => parts.find(p => p.type === key)!.value;
  return { date: `${v('year')}-${v('month')}-${v('day')}`, time: `${v('hour')}:${v('minute')}` };
}
export function pushAllowed(settings: CoachSettings, now: Date, timezone: string) {
  if (!settings.enabled || (settings.snoozedUntil && new Date(settings.snoozedUntil) > now)) return false;
  const { time } = localClock(now, timezone);
  const quiet = settings.quietStart === settings.quietEnd ? false : settings.quietStart < settings.quietEnd ? time >= settings.quietStart && time < settings.quietEnd : time >= settings.quietStart || time < settings.quietEnd;
  return !quiet;
}
