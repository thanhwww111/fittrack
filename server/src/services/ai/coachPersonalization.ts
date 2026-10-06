import { z } from 'zod';
import { addDays } from '../../utils/date';
import type { facts } from '../coach.service';

export function coachTrainingContext(f: Awaited<ReturnType<typeof facts>>) {
  const profile = f.profile;
  const mode = profile?.trainingMode ?? 'GYM';
  return {
    today: f.today, timezone: f.timezone,
    planningWindow: Array.from({ length: 7 }, (_, index) => { const date = addDays(f.today, index); return { date, dayOfWeek: new Date(`${date}T00:00:00Z`).getUTCDay() || 7 }; }),
    profile: profile ? { age: profile.age, gender: profile.gender, height: profile.height, currentWeight: profile.currentWeight, goalWeight: profile.goalWeight, goalRate: profile.goalRate, trainingDaysPerWeek: profile.trainingDaysPerWeek, goalType: profile.goalType, trainingMode: mode, activityLevel: profile.activityLevel } : null,
    survey: mode === 'OTHER' && f.survey ? { sport: f.survey.payload.sport, experience: f.survey.payload.experience, availableDays: f.survey.payload.availableDays } : null,
    gymSchedule: mode === 'GYM' ? f.effectiveGymSchedule?.days.map(d => ({ dayOfWeek: d.dayOfWeek, templateId: d.templateId, templateName: d.templateName, exercises: d.exercises.map(e => ({ name: e.exerciseName, sets: e.targetSets, reps: e.targetReps, restSeconds: e.restSeconds })) })) ?? null : null,
  };
}

export const trainingProposalSchema = z.array(z.object({
  date: z.string(), activity: z.enum(['GYM', 'YOGA', 'WALKING', 'REST']),
  title: z.string().trim().min(1).max(160), minutes: z.number().int().min(0).max(90),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  templateId: z.string().nullable(), intensity: z.enum(['EASY', 'MODERATE']),
  rationale: z.string().trim().min(1).max(500),
})).length(7);

/** Model suggestions are drafts: reject schedules that contradict declared limits. */
export function validateTrainingProposal(value: unknown, f: Awaited<ReturnType<typeof facts>>) {
  const days = trainingProposalSchema.parse(value);
  const maxSessions = f.profile?.trainingDaysPerWeek ?? 0;
  let sessions = 0;
  days.forEach((day, index) => {
    if (day.date !== addDays(f.today, index)) throw new Error('Proposal dates do not match the requested week');
    if (day.activity === 'REST') {
      if (day.minutes !== 0 || day.time !== null || day.templateId !== null) throw new Error('Rest days cannot contain a training session');
      return;
    }
    sessions++;
    if (day.minutes < 10) throw new Error('Training sessions need a realistic duration');
    if ((f.profile?.trainingMode ?? 'GYM') === 'GYM') {
      if (day.activity !== 'GYM' || day.time !== null) throw new Error('Gym availability times have not been declared');
      if (!f.effectiveGymSchedule?.days.some(d => d.templateId === day.templateId)) throw new Error('Unknown gym workout');
      if (index > 0 && days[index - 1].activity === 'GYM' && days[index - 1].templateId === day.templateId) throw new Error('Same gym workout needs recovery between sessions');
    } else {
      const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay() || 7;
      const slot = f.survey?.payload.availableDays.find(d => d.dayOfWeek === weekday);
      if (!slot || day.activity !== f.survey?.payload.sport || day.minutes > slot.durationMinutes || day.time !== slot.time || day.templateId !== null) throw new Error('Proposal exceeds surveyed availability');
      if (f.survey?.payload.experience === 'BEGINNER' && day.intensity !== 'EASY') throw new Error('Beginner activities must be easy');
    }
  });
  if (sessions > maxSessions || ((f.profile?.trainingMode ?? 'GYM') === 'GYM' && sessions > 6)) throw new Error('Proposal exceeds weekly training capacity');
  return days;
}
