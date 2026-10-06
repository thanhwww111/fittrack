import request from 'supertest';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/app';
import { createAuthedUser } from './helpers/auth';
import { useTestDatabase } from './helpers/db';
import { llm } from '../src/services/ai/llm';
import { coachConsent } from '../src/services/ai/coachConsent';
import { UserProfileModel } from '../src/models/userProfile.model';
import { LifestyleSurveyModel } from '../src/models/personalPlan.model';
import { TrainingScheduleModel } from '../src/models/trainingSchedule.model';
import { addDays } from '../src/utils/date';
useTestDatabase();
beforeEach(() => { coachConsent.enabled = true; });
afterEach(() => { vi.restoreAllMocks(); coachConsent.enabled = false; });

it('grounds PT requests in this account’s physical goals and surveyed availability', async () => {
  const a = await createAuthedUser();
  const b = await createAuthedUser();
  await UserProfileModel.findOneAndUpdate({ userId: a.userId }, { height: 170, currentWeight: 80, goalWeight: 70, goalType: 'WEIGHT_LOSS', trainingDaysPerWeek: 3, trainingMode: 'OTHER' }, { upsert: true });
  await LifestyleSurveyModel.create({ userId: a.userId, payload: { sport: 'WALKING', experience: 'BEGINNER', availableDays: [{ dayOfWeek: 2, time: '18:00', durationMinutes: 25 }], mealTimes: [], preferredFoodIds: [], excludedFoodIds: [] } });
  await LifestyleSurveyModel.create({ userId: b.userId, payload: { sport: 'YOGA', experience: 'REGULAR', availableDays: [{ dayOfWeek: 5, time: '09:00', durationMinutes: 90 }] } });
  const model = vi.spyOn(llm, 'generateJson').mockResolvedValue({ content: 'Your personal advice.' });
  expect((await request(app).post('/api/coach/messages').set(a.auth).send({ requestId: 'personal', text: 'Suggest my week' })).status).toBe(200);
  const facts = JSON.parse(model.mock.calls[0][0].prompt).facts;
  expect(facts.profile).toMatchObject({ height: 170, currentWeight: 80, goalWeight: 70, trainingDaysPerWeek: 3 });
  expect(facts.survey).toMatchObject({ sport: 'WALKING', experience: 'BEGINNER', availableDays: [{ dayOfWeek: 2, time: '18:00', durationMinutes: 25 }] });
  expect(facts.planningWindow).toHaveLength(7);
  expect(facts.planningWindow[0].date).toBe(facts.today);
  expect(JSON.stringify(facts)).not.toContain('user1@example.com');
});

it('uses known Gym workouts for legacy profiles and refuses a proposal if capacity changes during generation', async () => {
  const a = await createAuthedUser();
  await UserProfileModel.updateOne({ userId: a.userId }, { $set: { trainingDaysPerWeek: 3 }, $unset: { trainingMode: 1 } });
  await TrainingScheduleModel.create({ userId: a.userId, versions: [{ id: 'schedule', programId: 'program', name: 'Full body', timezone: 'Asia/Ho_Chi_Minh', effectiveFrom: '2020-01-01', days: [{ dayOfWeek: 1, templateId: 'full-body', templateName: 'Full Body', exerciseCount: 1, exercises: [{ exerciseId: 'squat', exerciseName: 'Squat', order: 0, targetSets: 3, targetReps: 10, restSeconds: 90 }] }] }] });
  const build = (prompt: string) => {
    const facts = JSON.parse(prompt).facts;
    expect(facts.profile.trainingMode).toBe('GYM');
    expect(facts.gymSchedule[0].exercises[0]).toMatchObject({ name: 'Squat', sets: 3, reps: 10 });
    return { content: 'Three sessions with recovery.', trainingProposal: facts.planningWindow.map((d: any, i: number) => ({ date: d.date, activity: [0, 2, 4].includes(i) ? 'GYM' : 'REST', title: 'Full body or recovery', minutes: [0, 2, 4].includes(i) ? 40 : 0, time: null, templateId: [0, 2, 4].includes(i) ? 'full-body' : null, intensity: 'MODERATE', rationale: 'A recovery day separates sessions.' })) };
  };
  vi.spyOn(llm, 'generateJson').mockImplementation(async ({ prompt }) => build(prompt));
  expect((await request(app).post('/api/coach/review').set(a.auth).send({ requestId: 'gym', kind: 'WEEKLY' })).status).toBe(200);
  vi.mocked(llm.generateJson).mockImplementation(async ({ prompt }) => {
    const result = build(prompt);
    await UserProfileModel.updateOne({ userId: a.userId }, { trainingDaysPerWeek: 1 });
    return result;
  });
  expect((await request(app).post('/api/coach/review').set(a.auth).send({ requestId: 'changed-gym', kind: 'WEEKLY' })).status).toBe(409);
});

it('persists a seven-day proposal and rejects activity outside personal availability', async () => {
  const a = await createAuthedUser();
  await UserProfileModel.findOneAndUpdate({ userId: a.userId }, { trainingMode: 'OTHER', trainingDaysPerWeek: 2 }, { upsert: true });
  await LifestyleSurveyModel.create({ userId: a.userId, payload: { sport: 'WALKING', experience: 'BEGINNER', availableDays: [{ dayOfWeek: 2, time: '18:00', durationMinutes: 25 }] } });
  vi.spyOn(llm, 'generateJson').mockImplementation(async ({ prompt }) => {
    const facts = JSON.parse(prompt).facts;
    return { content: 'A short walk fits your available time.', trainingProposal: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(facts.today, i);
      const active = (new Date(`${date}T00:00:00Z`).getUTCDay() || 7) === 2;
      return { date, activity: active ? 'WALKING' : 'REST', title: active ? 'Comfortable walk' : 'Recovery', minutes: active ? 20 : 0, time: active ? '18:00' : null, templateId: null, rationale: 'Based on your availability.', intensity: 'EASY' };
    }) };
  });
  const result = await request(app).post('/api/coach/review').set(a.auth).send({ requestId: 'week', kind: 'WEEKLY' });
  expect(result.status).toBe(200);
  expect(result.body.data.trainingProposal).toHaveLength(7);
  expect((await request(app).get('/api/coach/overview').set(a.auth)).body.data.trainingProposal).toEqual(result.body.data.trainingProposal);
  const saved = result.body.data.trainingProposal;
  vi.mocked(llm.generateJson).mockResolvedValue({ content: 'Too much.', trainingProposal: saved.map((d: any) => d.activity === 'REST' ? { ...d, activity: 'WALKING', minutes: 60, time: '10:00' } : d) });
  expect((await request(app).post('/api/coach/review').set(a.auth).send({ requestId: 'invalid-week', kind: 'WEEKLY' })).status).toBe(502);
});
