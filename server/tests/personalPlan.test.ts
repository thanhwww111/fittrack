import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { useTestDatabase } from './helpers/db';
import { createAuthedUser } from './helpers/auth';
import { FoodModel } from '../src/models/food.model';
import { FoodLogModel } from '../src/models/foodLog.model';
import { NutritionTargetModel } from '../src/models/nutritionTarget.model';
import { UserProfileModel } from '../src/models/userProfile.model';
import { todayInTimezone, addDays } from '../src/utils/date';
import { mockCoachPlan } from './helpers/coachPlan';
import { coachConsent } from '../src/services/ai/coachConsent';
import { CoachBudgetModel } from '../src/models/coach.model';
import { PlanGenerationModel } from '../src/models/planGeneration.model';
import { llm } from '../src/services/ai/llm';
import { PersonalPlanModel, LifestyleSurveyModel } from '../src/models/personalPlan.model';
import { CoachCheckInModel, CoachSettingsModel } from '../src/models/coach.model';

useTestDatabase();
beforeEach(() => { mockCoachPlan(); });
afterEach(() => { vi.restoreAllMocks(); coachConsent.enabled = false; });
const base = '/api/personal-plan';
const survey = { revision: 0, sport: 'YOGA', experience: 'BEGINNER',
  availableDays: [1, 3, 5].map(dayOfWeek => ({ dayOfWeek, time: '18:00', durationMinutes: 30 })),
  mealTimes: [{ mealId: 'BREAKFAST', time: '07:00' }, { mealId: 'LUNCH', time: '12:00' }, { mealId: 'DINNER', time: '19:00' }],
  preferredFoodIds: [], excludedFoodIds: [], remindersEnabled: false };
async function fixture() {
  const user = await createAuthedUser();
  await UserProfileModel.updateOne({ userId: user.userId }, { $set: { timezone: 'Asia/Ho_Chi_Minh' } });
  const today = todayInTimezone('Asia/Ho_Chi_Minh');
  const target = await NutritionTargetModel.create({ userId: user.userId, calories: 1800, protein: 100, carbs: 200, fat: 60, effectiveFrom: today, source: 'MANUAL' });
  const food = await FoodModel.create({ name: 'Rice and beans', servingSize: 100, servingUnit: 'g', calories: 200, protein: 10, carbs: 30, fat: 5 });
  return { ...user, today, target, food };
}
async function draft(f: Awaited<ReturnType<typeof fixture>>, requestId = 'draft-one') {
  const saved = await request(app).put(base + '/survey').set(f.auth).send(survey);
  expect(saved.status).toBe(200);
  const result = await request(app).post(base + '/drafts').set(f.auth).send({ requestId });
  expect(result.status).toBe(200);
  return result.body.data;
}
async function apply(f: Awaited<ReturnType<typeof fixture>>, d: { id: string; revision: number }, requestId = 'apply-one') {
  return request(app).post(`${base}/drafts/${d.id}/apply`).set(f.auth).send({ revision: d.revision, requestId });
}
describe('personal plan', () => {
  it('stores a real AI draft and persists generation replay without applying or logging', async () => {
    const f = await fixture(); const d = await draft(f);
    expect(d.generatorVersion).toBe('ai-pt-v1');
    expect(d.coachSummary).toBe('Personalized seven-day draft.');
    expect(d.days[0].coachNote).toBe('Adapt to your energy today.');
    expect(await PlanGenerationModel.countDocuments({ state: 'SUCCEEDED' })).toBe(1);
    vi.spyOn(llm, 'generateJson').mockRejectedValue(new Error('Replay must not call Gemini'));
    expect((await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'draft-one' })).body.data.id).toBe(d.id);
    expect((await request(app).get(base + '/current').set(f.auth)).body.data.current).toBeNull();
    expect(await FoodLogModel.countDocuments()).toBe(0);
    expect((await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'draft-one', startDate: addDays(f.today, 1) })).status).toBe(409);
  });
  it('fails honestly without valid AI and will not repeat a failed paid request', async () => {
    const f = await fixture(); await request(app).put(base + '/survey').set(f.auth).send(survey);
    vi.spyOn(llm, 'generateJson').mockResolvedValue({ summary: 'Invalid', days: [] });
    const first = await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'invalid-ai' });
    expect(first.status).toBe(502);
    expect(await PlanGenerationModel.countDocuments({ state: 'FAILED' })).toBe(1);
    vi.spyOn(llm, 'generateJson').mockRejectedValue(new Error('Must not call again'));
    expect((await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'invalid-ai' })).status).toBe(502);
  });
  it('enforces explicit consent and five daily AI plan attempts', async () => {
    const f = await fixture(); await request(app).put(base + '/survey').set(f.auth).send(survey);
    coachConsent.enabled = false;
    expect((await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'no-consent' })).status).toBe(503);
    expect(await PlanGenerationModel.countDocuments()).toBe(0);
    coachConsent.enabled = true;
    await CoachBudgetModel.create({ userId: f.userId, date: f.today, channel: 'AI_PLAN', used: 5 });
    expect((await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'quota' })).status).toBe(429);
  });
  it('claims concurrent generation once and gives pending retries a distinct response', async () => {
    const f = await fixture(); await request(app).put(base + '/survey').set(f.auth).send(survey);
    const original = vi.mocked(llm.generateJson).getMockImplementation()!;
    let release!: () => void; let started!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const entered = new Promise<void>(resolve => { started = resolve; });
    vi.spyOn(llm, 'generateJson').mockImplementation(async options => { started(); await barrier; return original(options); });
    const first = request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'concurrent-ai' }).then(r => r);
    await entered;
    const pending = await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'concurrent-ai' });
    expect(pending.status).toBe(409);
    expect(pending.body.error.details).toBeUndefined();
    release(); const completed = await first;
    expect(completed.status).toBe(200);
    expect(await PlanGenerationModel.countDocuments({ state: 'SUCCEEDED' })).toBe(1);
    expect(await PersonalPlanModel.countDocuments()).toBe(1);
    expect((await CoachBudgetModel.findOne({ channel: 'AI_PLAN' }))!.used).toBe(1);
  });
  it('discards model output when survey changes during generation', async () => {
    const f = await fixture(); await request(app).put(base + '/survey').set(f.auth).send(survey);
    const original = vi.mocked(llm.generateJson).getMockImplementation()!;
    vi.spyOn(llm, 'generateJson').mockImplementation(async options => {
      const result = await original(options);
      await LifestyleSurveyModel.updateOne({ userId: f.userId }, { $inc: { revision: 1 } });
      return result;
    });
    const result = await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'stale-ai' });
    expect(result.status).toBe(409);
    expect(result.body.error.details.code).toBe('PLAN_GENERATION_FAILED');
    expect(await PersonalPlanModel.countDocuments()).toBe(0);
  });
  it('grounds AI in owned fitness facts and check-ins without contacts or foreign feedback', async () => {
    const f = await fixture(); const other = await createAuthedUser();
    await UserProfileModel.updateOne({ userId: f.userId }, { $set: { age: 28, currentWeight: 70, goalType: 'LOSE_WEIGHT' } });
    await CoachCheckInModel.create({ userId: f.userId, date: f.today, energy: 2, difficulty: 5, note: 'Prefer gentle today' });
    await CoachCheckInModel.create({ userId: other.userId, date: f.today, energy: 1, difficulty: 1, note: 'Foreign private feedback' });
    await CoachSettingsModel.create({ userId: f.userId, language: 'en', tone: 'FIRM' });
    const original = vi.mocked(llm.generateJson).getMockImplementation()!; let context: any;
    vi.spyOn(llm, 'generateJson').mockImplementation(async options => { context = JSON.parse(options.prompt); return original(options); });
    await draft(f);
    expect(context.profile).toMatchObject({ age: 28, currentWeight: 70, tone: 'FIRM' });
    expect(context.recentFeedback).toEqual([{ date: f.today, energy: 2, difficulty: 5, note: 'Prefer gentle today' }]);
    expect(JSON.stringify(context)).not.toContain('Foreign private feedback');
    expect(context.profile).not.toHaveProperty('email');
    expect(context.profile).not.toHaveProperty('userId');
    expect(context.foods[0]).not.toHaveProperty('createdBy');
    expect(context.foods[0]).not.toHaveProperty('_id');
    expect(context.foods[0]).not.toHaveProperty('__v');
  });
  it('requires all three primary meals while allowing optional meals to be absent or selected', async () => {
    const f = await fixture();
    for (const mealId of ['BREAKFAST', 'LUNCH', 'DINNER']) {
      const response = await request(app).put(base + '/survey').set(f.auth).send({ ...survey, mealTimes: survey.mealTimes.filter(meal => meal.mealId !== mealId) });
      expect(response.status).toBe(400);
    }
    const primary = await request(app).put(base + '/survey').set(f.auth).send(survey);
    expect(primary.status).toBe(200);
    const optional = await request(app).put(base + '/survey').set(f.auth).send({ ...survey, revision: primary.body.data.revision, mealTimes: [...survey.mealTimes, { mealId: 'SNACK', time: '15:00' }] });
    expect(optional.status).toBe(200);
    const generated = await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'optional-meal-plan' });
    expect(generated.body.data.days.every((day: { meals: { mealId: string }[] }) => day.meals.map(meal => meal.mealId).join(',') === 'BREAKFAST,LUNCH,DINNER,SNACK')).toBe(true);
  });
  it('returns the nearest pending plan and all effective future plans for reminders', async () => {
    const f = await fixture(); await request(app).put(base + '/survey').set(f.auth).send(survey);
    const a = (await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'future-a', startDate: addDays(f.today, 2) })).body.data;
    expect((await apply(f, a, 'future-a-apply')).status).toBe(200);
    const b = (await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'future-b', startDate: addDays(f.today, 4) })).body.data;
    const response = await apply(f, b, 'future-b-apply');
    expect(response.status).toBe(200);
    expect(response.body.data.pending.id).toBe(a.id);
    expect(response.body.data.upcoming.map((p: { id: string }) => p.id)).toEqual([a.id, b.id]);
    expect(response.body.data.upcoming[0].days[2].effective).toBe(false);
  });
  it('generates exactly three yoga days and seven dated days without recording food', async () => {
    const f = await fixture(); const d = await draft(f);
    expect(d.days).toHaveLength(7);
    expect(d.days[0].date).toBe(f.today);
    expect(d.days[6].date).toBe(addDays(f.today, 6));
    const activities = d.days.filter((day: { activity: unknown }) => day.activity);
    expect(activities).toHaveLength(3);
    for (const day of activities) {
      expect(day.activity.sport).toBe('YOGA');
      expect(day.activity.steps.reduce((sum: number, step: { minutes: number }) => sum + step.minutes, 0)).toBe(30);
      expect([1, 3, 5]).toContain(new Date(day.date + 'T12:00:00Z').getUTCDay() || 7);
    }
    expect(d.days[0].totals.calories).toBeGreaterThan(0);
    expect(await FoodLogModel.countDocuments()).toBe(0);
  });
  it('validates days, time, mode, quantity and revision rather than accepting malformed surveys', async () => {
    const f = await fixture();
    for (const patch of [{ sport: 'GYM' }, { availableDays: [survey.availableDays[0], survey.availableDays[0]] }, { availableDays: [{ dayOfWeek: 2, time: '25:00', durationMinutes: 30 }] }, { availableDays: [] }]) {
      expect((await request(app).put(base + '/survey').set(f.auth).send({ ...survey, ...patch })).status).toBe(400);
    }
    expect((await request(app).put(base + '/survey').set(f.auth).send(survey)).status).toBe(200);
    expect((await request(app).put(base + '/survey').set(f.auth).send(survey)).status).toBe(409);
  });
  it('rejects foreign surveys, drafts and activity access', async () => {
    const f = await fixture(); const d = await draft(f); const other = await createAuthedUser();
    expect((await request(app).get(`${base}/drafts/${d.id}`).set(other.auth)).status).toBe(404);
    expect((await request(app).post(`${base}/drafts/${d.id}/apply`).set(other.auth).send({ revision: 0, requestId: 'other' })).status).toBe(404);
    const privateFood = await FoodModel.create({ name: 'Private', servingSize: 100, servingUnit: 'g', calories: 100, protein: 5, carbs: 10, fat: 2, isCustom: true, createdBy: other.userId });
    expect((await request(app).put(base + '/survey').set(f.auth).send({ ...survey, revision: 1, preferredFoodIds: [privateFood.id] })).status).toBe(404);
  });
  it('retries draft creation and activation once under concurrent requests', async () => {
    const f = await fixture(); const d = await draft(f);
    const again = await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'draft-one' });
    expect(again.body.data.id).toBe(d.id);
    const results = await Promise.all([apply(f, d), apply(f, d), apply(f, d)]);
    expect(results.map(r => r.status)).toEqual([200, 200, 200]);
    expect(results[0].body.data.current.id).toBe(d.id);
    expect(results[0].body.data.current.startDate).toBe(f.today);
    expect((await request(app).get(base + '/history').set(f.auth)).body.data).toHaveLength(1);
    expect(await FoodLogModel.countDocuments()).toBe(0);
  });
  it('replaces tomorrow while keeping today and rejecting a request id reused with another plan', async () => {
    const f = await fixture(); const d = await draft(f); await apply(f, d);
    const next = (await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'draft-two' })).body.data;
    expect(next.startDate).toBe(addDays(f.today, 1));
    const r = await apply(f, next, 'apply-two');
    expect(r.body.data.current.id).toBe(d.id);
    expect(r.body.data.pending.id).toBe(next.id);
    expect((await apply(f, next, 'apply-one')).status).toBe(409);
    const tomorrow = await request(app).get(base + '/current').query({ date: addDays(f.today, 1) }).set(f.auth);
    expect(tomorrow.body.data.current.id).toBe(next.id);
  });
  it('rejects stale targets and survey revisions before activating a draft', async () => {
    const f = await fixture(); const d = await draft(f);
    await NutritionTargetModel.updateOne({ _id: f.target.id }, { $set: { calories: 1700 } });
    expect((await apply(f, d)).status).toBe(409);
    await NutritionTargetModel.updateOne({ _id: f.target.id }, { $set: { calories: 1800 } });
    await request(app).put(base + '/survey').set(f.auth).send({ ...survey, revision: 1, sport: 'WALKING' });
    expect((await apply(f, d)).status).toBe(409);
  });
  it('edits food quantities using actual food values and publishes an immutable draft', async () => {
    const f = await fixture(); const d = await draft(f);
    const days = d.days.map((day: { meals: { items: { quantity: number }[] }[] }) => ({ ...day, meals: day.meals.map(meal => ({ ...meal, items: meal.items.map(item => ({ ...item, quantity: 100, calories: 99999 })) })) }));
    const changed = await request(app).put(`${base}/drafts/${d.id}`).set(f.auth).send({ revision: 0, days });
    expect(changed.status).toBe(200);
    expect(changed.body.data.days[0].meals[0].items[0].calories).toBe(200);
    expect((await request(app).put(`${base}/drafts/${d.id}`).set(f.auth).send({ revision: 0, days })).status).toBe(409);
    await apply(f, changed.body.data);
    expect((await request(app).put(`${base}/drafts/${d.id}`).set(f.auth).send({ revision: 1, days })).status).toBe(409);
  });
  it('logs one shared FoodLog for simultaneous confirmations and permits relog after deletion', async () => {
    const f = await fixture(); const d = await draft(f); await apply(f, d);
    const item = d.days[0].meals[0].items[0];
    const log = () => request(app).post(`${base}/${d.id}/items/${item.id}/log`).set(f.auth).send({ quantity: 100, mealType: 'BREAKFAST', foodVersion: item.foodVersion });
    const results = await Promise.all([log(), log(), log()]);
    expect(results.map(r => r.status)).toEqual([200, 200, 200]);
    expect(new Set(results.map(r => r.body.data.id)).size).toBe(1);
    expect(await FoodLogModel.countDocuments()).toBe(1);
    expect(results[0].body.data).toMatchObject({ calories: 200, protein: 10, date: f.today });
    await request(app).delete(`/api/food-logs/${results[0].body.data.id}`).set(f.auth);
    expect((await log()).status).toBe(200);
    expect(await FoodLogModel.countDocuments()).toBe(1);
  });
  it('requires refreshed food confirmation after a food edit and rejects future items', async () => {
    const f = await fixture(); const d = await draft(f); await apply(f, d);
    const item = d.days[0].meals[0].items[0];
    await FoodModel.updateOne({ _id: f.food.id }, { $set: { calories: 250 } });
    const url = `${base}/${d.id}/items/${item.id}/log`;
    expect((await request(app).post(url).set(f.auth).send({ quantity: 100, mealType: 'BREAKFAST', foodVersion: item.foodVersion })).status).toBe(409);
    const future = d.days[1].meals[0].items[0];
    expect((await request(app).post(`${base}/${d.id}/items/${future.id}/log`).set(f.auth).send({ quantity: 100, mealType: 'BREAKFAST', foodVersion: future.foodVersion })).status).toBe(400);
  });
  it('records activities separately, enforcing date and optimistic revision', async () => {
    const f = await fixture(); const todayDay = new Date(f.today + 'T12:00:00Z').getUTCDay() || 7;
    await request(app).put(base + '/survey').set(f.auth).send({ ...survey, availableDays: [{ dayOfWeek: todayDay, time: '18:00', durationMinutes: 20 }] });
    const d = (await request(app).post(base + '/drafts').set(f.auth).send({ requestId: 'activity' })).body.data;
    await apply(f, d);
    const url = `${base}/${d.id}/activities/${d.days[0].activity.id}/log`;
    const r = await request(app).put(url).set(f.auth).send({ revision: 0, status: 'COMPLETED', actualMinutes: 18, note: 'Good' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'COMPLETED', actualMinutes: 18, revision: 1 });
    expect((await request(app).put(url).set(f.auth).send({ revision: 0, status: 'COMPLETED', actualMinutes: 20 })).status).toBe(409);
    const current = (await request(app).get(base + '/current').set(f.auth)).body.data;
    expect(current.current.days[0].activity.status).toBe('COMPLETED');
    expect(await FoodLogModel.countDocuments()).toBe(0);
  });
  it('copies a planned meal into shared nutrition without duplicating its source link', async () => {
    const f = await fixture(); const d = await draft(f); await apply(f, d);
    const item = d.days[0].meals[0].items[0];
    await request(app).post(`${base}/${d.id}/items/${item.id}/log`).set(f.auth).send({ quantity: 100, mealType: 'BREAKFAST', foodVersion: item.foodVersion });
    const response = await request(app).post('/api/food-logs/copy').set(f.auth).send({ fromDate: f.today, fromMealType: 'BREAKFAST', toDate: f.today, toMealType: 'LUNCH' });
    expect(response.status).toBe(201);
    expect(response.body.data.items[0].sourcePlanId).toBeUndefined();
    expect(await FoodLogModel.countDocuments()).toBe(2);
  });
  it('supports empty food libraries without invented meals', async () => {
    const f = await fixture(); await FoodModel.deleteMany({}); const d = await draft(f);
    expect(d.days[0].meals[0].items).toHaveLength(0);
    expect(d.days[0].totals.calories).toBe(0);
  });
});
