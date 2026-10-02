import { buildWorkoutReminders, type WorkoutReminderSchedule } from "@/lib/workoutReminders";

const workout = { templateName: "Upper", exerciseCount: 6 };
const schedule: WorkoutReminderSchedule = {
  today: "2026-10-01", timezone: "Asia/Ho_Chi_Minh",
  days: [
    { date: "2026-09-30", status: "MISSED", workout },
    { date: "2026-10-01", status: "PLANNED", workout },
    { date: "2026-10-02", status: "REST", workout: null },
    { date: "2026-10-03", status: "PLANNED", workout: { ...workout, templateName: "Lower" } },
  ],
};
it("uses account timezone and the scheduled workout name; skips rest and missed days", () => {
  const reminders = buildWorkoutReminders({ now: new Date("2026-09-30T22:00:00Z"), time: "07:00", schedule });
  expect(reminders.map((r) => r.date.toISOString())).toEqual(["2026-10-01T00:00:00.000Z", "2026-10-03T00:00:00.000Z"]);
  expect(reminders[0].body).toContain("Upper · 6 bài tập");
  expect(reminders[1].body).toContain("Lower");
});
it("does not notify at a time already passed or for completed workouts", () => {
  expect(buildWorkoutReminders({ now: new Date("2026-10-01T00:00:00Z"), time: "07:00",
    schedule: { ...schedule, days: schedule.days.map((d) => d.date === "2026-10-03" ? { ...d, status: "COMPLETED" } : d) },
  })).toEqual([]);
});
it("handles DST and the pending schedule timezone for each date", () => {
  const reminders = buildWorkoutReminders({ now: new Date("2026-10-31T00:00:00Z"), time: "07:00",
    schedule: { today: "2026-10-31", timezone: "UTC", days: [
      { date: "2026-10-31", timezone: "America/New_York", status: "PLANNED", workout },
      { date: "2026-11-01", timezone: "America/New_York", status: "PLANNED", workout },
    ] },
  });
  expect(reminders.map((r) => r.date.toISOString())).toEqual(["2026-10-31T11:00:00.000Z", "2026-11-01T12:00:00.000Z"]);
});
it("limits the calendar horizon to 28 days and rejects invalid times", () => {
  const many = { ...schedule, days: Array.from({ length: 35 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), status: "PLANNED", workout,
  })) };
  const input = { now: new Date("2026-09-30T22:00:00Z"), time: "07:00", schedule: many };
  expect(buildWorkoutReminders(input)).toHaveLength(28);
  expect(buildWorkoutReminders({ ...input, time: "25:00" })).toEqual([]);
});
