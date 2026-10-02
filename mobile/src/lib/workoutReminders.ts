export interface WorkoutReminderSchedule {
  today: string;
  timezone: string;
  days: {
    date: string;
    timezone?: string;
    status: string;
    workout: { templateName: string; exerciseCount: number } | null;
  }[];
}

export interface WorkoutReminder {
  id: string;
  date: Date;
  title: string;
  body: string;
}

export function buildWorkoutReminders(input: {
  now: Date; time: string; schedule: WorkoutReminderSchedule;
}): WorkoutReminder[] {
  const { now, time, schedule } = input;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return [];
  const horizon = Date.parse(`${schedule.today}T00:00:00Z`) + 28 * 86_400_000;
  const used = new Set<string>();
  return schedule.days.flatMap((day) => {
    if (day.status !== "PLANNED" || !day.workout || used.has(day.date)
      || day.date < schedule.today || Date.parse(`${day.date}T00:00:00Z`) >= horizon) return [];
    const date = zonedDate(day.date, time, day.timezone ?? schedule.timezone);
    if (!date || date <= now) return [];
    used.add(day.date);
    return [{
      id: `workout-${day.date}`,
      date,
      title: "💪 Lịch tập hôm nay",
      body: `Hôm nay lịch tập của bạn là ${day.workout.templateName} · ${day.workout.exerciseCount} bài tập.`,
    }];
  }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 28);
}

// Convert a calendar time in an IANA timezone without assuming the phone has that timezone.
// Nonexistent DST wall times are skipped rather than delivered on the wrong day.
function zonedDate(day: string, time: string, timezone: string): Date | null {
  try {
    const target = Date.parse(`${day}T${time}:00Z`);
    if (!Number.isFinite(target)) return null;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    let candidate = target;
    for (let i = 0; i < 4; i += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((p) => [p.type, p.value]));
      const actual = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
      if (actual === target) return new Date(candidate);
      candidate += target - actual;
    }
    return null;
  } catch {
    return null;
  }
}
