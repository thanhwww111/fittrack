import type { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { LifestyleSurveyModel, PersonalPlanModel, PersonalPlanStateModel, ActivityLogModel, type Activation } from '../models/personalPlan.model';
import { FoodModel } from '../models/food.model';
import { FoodLogModel } from '../models/foodLog.model';
import { AppError } from '../utils/AppError';
import { addDays, todayInTimezone } from '../utils/date';
import { sumNutrition } from '../utils/foodNutrition';
import { planItem, foodVersion, type TargetSnapshot, type PlanFood, type PlanDay } from '../utils/personalPlan';
import { PlanGenerationModel } from '../models/planGeneration.model';
import { UserProfileModel } from '../models/userProfile.model';
import { CoachCheckInModel } from '../models/coach.model';
import { claimBudget, settings as coachSettings } from './coach.service';
import { generatePersonalPlan } from './ai/personalPlanGenerator';
import { requireCoachConsent } from './ai/coachConsent';
import { activitySteps } from '../constants/activityGuides';
import { getUserTimezone } from './profile.service';
import { getActiveTarget } from './goal.service';
import { getVisibleFood } from './food.service';
import { resolveMeal } from './meal.service';
import { buildFoodLog, resolveLogDate } from './foodLog.service';
import type { SurveyInput, planEditSchema, activityLogSchema, itemLogSchema } from '../schemas/personalPlan.schema';

const duplicate = (error: unknown) => (error as { code?: number }).code === 11000;
const onDate = (activations: Activation[], date: string) => [...activations].reverse().find(a => a.effectiveFrom <= date);
async function stateFor(userId: string) {
  try { await PersonalPlanStateModel.updateOne({ userId }, { $setOnInsert: { userId, revision: 0, activations: [] } }, { upsert: true }); }
  catch (error) { if (!duplicate(error)) throw error; }
  return (await PersonalPlanStateModel.findOne({ userId }).lean())!;
}
async function ownedPlan(userId: string, id: string) {
  const plan = await PersonalPlanModel.findOne({ _id: id, userId });
  if (!plan) throw AppError.notFound('Personal plan not found');
  return plan;
}
async function targetFor(userId: string, date: string): Promise<TargetSnapshot> {
  const target = await getActiveTarget(userId, date);
  if (!target) throw AppError.badRequest('Set a nutrition target before creating a plan');
  return { id: target.id, effectiveFrom: target.effectiveFrom, calories: target.calories, protein: target.protein, carbs: target.carbs, fat: target.fat };
}
export async function getSurvey(userId: string) {
  const doc = await LifestyleSurveyModel.findOne({ userId }).lean();
  return doc ? { ...doc.payload, revision: doc.revision } : null;
}
export async function saveSurvey(userId: string, input: SurveyInput) {
  await Promise.all([...new Set([...input.preferredFoodIds, ...input.excludedFoodIds])].map(id => getVisibleFood(userId, id)));
  await Promise.all(input.mealTimes.map(m => resolveMeal(userId, m.mealId)));
  const current = await LifestyleSurveyModel.findOne({ userId });
  if (!current) {
    if (input.revision !== 0) throw AppError.conflict('Survey changed; reload it');
    try { await LifestyleSurveyModel.create({ userId, revision: 1, payload: { ...input, revision: 1 } }); }
    catch (error) { if (duplicate(error)) throw AppError.conflict('Survey changed; reload it'); throw error; }
  } else {
    const r = await LifestyleSurveyModel.updateOne({ userId, revision: input.revision }, { $set: { payload: { ...input, revision: input.revision + 1 } }, $inc: { revision: 1 } });
    if (!r.modifiedCount) throw AppError.conflict('Survey changed; reload it');
  }
  return getSurvey(userId);
}
export async function createDraft(userId: string, input: { requestId: string; startDate?: string }) {
  const previous = await PersonalPlanModel.findOne({ userId, requestId: input.requestId });
  if (previous) {
    if (previous.requestStartDate !== input.startDate) throw AppError.conflict('requestId was used for another start date');
    return previous.toJSON();
  }
  requireCoachConsent();
  const priorGeneration = await PlanGenerationModel.findOne({ userId, requestId: input.requestId });
  if (priorGeneration) {
    if (priorGeneration.requestStartDate !== input.startDate) throw AppError.conflict('requestId was used for another start date');
    if (priorGeneration.state === 'FAILED') throw new AppError(priorGeneration.statusCode ?? 502, priorGeneration.error ?? 'AI plan failed; start a new request', { code: 'PLAN_GENERATION_FAILED', retryable: true });
    if (priorGeneration.leaseUntil && priorGeneration.leaseUntil < new Date()) {
      await PlanGenerationModel.updateOne({ _id: priorGeneration._id, state: 'PROCESSING', leaseUntil: { $lt: new Date() } }, { $set: { state: 'FAILED', error: 'AI plan request expired; start a new request', statusCode: 504 } });
      throw new AppError(504, 'AI plan request expired; start a new request', { code: 'PLAN_GENERATION_FAILED', retryable: true });
    }
    throw AppError.conflict('AI plan is being generated; retry the same request later');
  }
  const survey = await getSurvey(userId);
  if (!survey) throw AppError.badRequest('Complete the lifestyle survey first');
  const timezone = await getUserTimezone(userId);
  const today = todayInTimezone(timezone);
  const state = await stateFor(userId);
  const current = onDate(state.activations, today);
  const currentPlan = current ? await PersonalPlanModel.findOne({ _id: current.planId, userId }) : null;
  const earliest = currentPlan && currentPlan.endDate >= today ? addDays(today, 1) : today;
  const startDate = input.startDate ?? earliest;
  if (startDate < earliest || startDate > addDays(today, 30)) throw AppError.badRequest('Start date must be within the next 30 days and after the current day when replacing a plan');
  const target = await targetFor(userId, startDate);
  const library = await FoodModel.find({ $or: [{ createdBy: null }, { createdBy: userId }] }).sort({ _id: 1 }).lean();
  const foods: PlanFood[] = library.map(f => ({ id: String(f._id), name: f.name, servingSize: f.servingSize, servingUnit: f.servingUnit, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber }));
  const lockToken = randomUUID();
  let generation;
  try { generation = await PlanGenerationModel.create({ userId, requestId: input.requestId, requestStartDate: input.startDate, state: 'PROCESSING', lockToken, leaseUntil: new Date(Date.now() + 120000) }); }
  catch (error) { if (duplicate(error)) return createDraft(userId, input); throw error; }
  try {
    if (!await claimBudget(userId, today, 'AI_PLAN', 5, input.requestId)) throw new AppError(429, 'Daily AI plan quota reached');
    const [profile, feedback, preferences] = await Promise.all([UserProfileModel.findOne({ userId }).lean(), CoachCheckInModel.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(), coachSettings(userId)]);
    // Only consented fitness facts are shared; account/contact/device data stay local.
    const groundedProfile = profile ? { age: profile.age, gender: profile.gender, height: profile.height, currentWeight: profile.currentWeight, activityLevel: profile.activityLevel, goalType: profile.goalType, goalWeight: profile.goalWeight, trainingMode: profile.trainingMode, tone: preferences.tone } : { tone: preferences.tone };
    requireCoachConsent();
    const proposed = await generatePersonalPlan({ startDate, survey, foods, target, profile: groundedProfile, feedback: feedback.map(c => ({ date: c.date, energy: c.energy, difficulty: c.difficulty, note: c.note })), language: preferences.language });
    const [latestSurvey, latestTarget, latestTimezone, latestState] = await Promise.all([getSurvey(userId), targetFor(userId, startDate), getUserTimezone(userId), stateFor(userId)]);
    if (latestSurvey?.revision !== survey.revision || JSON.stringify(latestTarget) !== JSON.stringify(target) || latestTimezone !== timezone || latestState.revision !== state.revision) throw AppError.conflict('Survey, target, timezone or applied plan changed; generate a new draft');
    await Promise.all(survey.mealTimes.map(m => resolveMeal(userId, m.mealId)));
    const selected = new Map(proposed.days.flatMap(day => day.meals.flatMap(meal => meal.items.map(item => [item.foodId, item.foodVersion] as const))));
    await Promise.all([...selected].map(async ([id, version]) => { const food = await getVisibleFood(userId, id); if (foodVersion(food.toObject()) !== version) throw AppError.conflict('Food library changed; generate a new draft'); }));
    if (!await PlanGenerationModel.exists({ _id: generation._id, state: 'PROCESSING', lockToken, leaseUntil: { $gt: new Date() } })) throw AppError.conflict('AI generation lease expired; generate a new draft');
    const plan = await PersonalPlanModel.create({ userId, requestId: input.requestId, requestStartDate: input.startDate, revision: 0, generatorVersion: 'ai-pt-v1', coachSummary: proposed.summary, timezone, startDate, endDate: addDays(startDate, 6), sourceSurveyRevision: survey.revision, surveySnapshot: survey, targetSnapshot: target, days: proposed.days });
    await PlanGenerationModel.updateOne({ _id: generation._id, lockToken }, { $set: { state: 'SUCCEEDED', planId: plan.id } });
    return plan.toJSON();
  } catch (error) {
    const failure = error instanceof AppError ? error : new AppError(502, 'AI plan service is unavailable; start a new request');
    failure.details = { code: 'PLAN_GENERATION_FAILED', retryable: true };
    await PlanGenerationModel.updateOne({ _id: generation._id, state: 'PROCESSING', lockToken }, { $set: { state: 'FAILED', statusCode: failure.statusCode, error: failure.message } });
    throw failure;
  }
}
export async function getDraft(userId: string, id: string) { return (await ownedPlan(userId, id)).toJSON(); }
export async function editDraft(userId: string, id: string, input: z.infer<typeof planEditSchema>) {
  const plan = await ownedPlan(userId, id);
  if (plan.state !== 'DRAFT' || plan.revision !== input.revision) throw AppError.conflict('Draft changed or was already published');
  const itemIds = new Set<string>();
  const activityIds = new Set<string>();
  const days: PlanDay[] = [];
  for (let index = 0; index < 7; index++) {
    const day = input.days[index];
    if (day.date !== addDays(plan.startDate, index)) throw AppError.badRequest('Keep seven consecutive plan dates');
    const weekday = new Date(day.date + 'T12:00:00Z').getUTCDay() || 7;
    const available = plan.surveySnapshot.availableDays.find(d => d.dayOfWeek === weekday);
    if (!!available !== !!day.activity) throw AppError.badRequest('Activities must match selected available days');
    let activity: PlanDay['activity'] = null;
    if (day.activity) {
      const original = plan.days.flatMap(d => d.activity ? [d.activity] : []).find(a => a.id === day.activity!.id);
      if (!original || activityIds.has(day.activity.id) || day.activity.plannedMinutes > available!.durationMinutes) throw AppError.badRequest('Invalid activity or duration exceeds availability');
      activityIds.add(day.activity.id);
      activity = { ...original, time: day.activity.time, plannedMinutes: day.activity.plannedMinutes, steps: activitySteps(plan.surveySnapshot.sport, day.activity.plannedMinutes) };
    }
    const mealIds = new Set<string>();
    const meals: PlanDay['meals'] = [];
    for (const meal of day.meals) {
      if (mealIds.has(meal.mealId)) throw AppError.badRequest('Duplicate meal');
      mealIds.add(meal.mealId);
      await resolveMeal(userId, meal.mealId);
      const items = [];
      for (const item of meal.items) {
        if (itemIds.has(item.id) || plan.surveySnapshot.excludedFoodIds.includes(item.foodId)) throw AppError.badRequest('Duplicate or excluded food item');
        itemIds.add(item.id);
        const food = await getVisibleFood(userId, item.foodId);
        items.push(planItem({ ...food.toObject(), id: food.id }, item.quantity, item.id));
      }
      meals.push({ mealId: meal.mealId, time: meal.time, items });
    }
    days.push({ date: day.date, coachNote: plan.days[index].coachNote, activity, meals, totals: sumNutrition(meals.flatMap(m => m.items)) });
  }
  const result = await PersonalPlanModel.updateOne({ _id: id, userId, revision: input.revision, state: 'DRAFT' }, { $set: { days }, $inc: { revision: 1 } });
  if (!result.modifiedCount) throw AppError.conflict('Draft changed; reload it');
  return getDraft(userId, id);
}
export async function applyDraft(userId: string, id: string, input: { revision: number; requestId: string }) {
  const plan = await ownedPlan(userId, id);
  for (let attempt = 0; attempt < 20; attempt++) {
    const state = await stateFor(userId);
    const previous = state.activations.find(a => a.requestId === input.requestId);
    if (previous) {
      if (previous.planId !== id || previous.planRevision !== input.revision) throw AppError.conflict('requestId was used for a different plan');
      return getCurrent(userId);
    }
    if (state.activations.some(a => a.planId === id)) throw AppError.conflict('Plan was already applied');
    const timezone = await getUserTimezone(userId);
    const today = todayInTimezone(timezone);
    const current = onDate(state.activations, today);
    const currentPlan = current ? await PersonalPlanModel.findById(current.planId) : null;
    const earliest = currentPlan && currentPlan.endDate >= today ? addDays(today, 1) : today;
    const survey = await getSurvey(userId);
    const target = await targetFor(userId, plan.startDate);
    if (plan.revision !== input.revision || plan.timezone !== timezone || plan.startDate < earliest || survey?.revision !== plan.sourceSurveyRevision || JSON.stringify(target) !== JSON.stringify(plan.targetSnapshot)) throw AppError.conflict('Survey, target or start date changed; create a new draft');
    // Revalidate visible foods/meals before publishing; immutable content is authoritative.
    await Promise.all(plan.days.flatMap(d => d.meals.flatMap(m => [resolveMeal(userId, m.mealId), ...m.items.map(async item => {
      const food = await getVisibleFood(userId, item.foodId);
      if (foodVersion(food) !== item.foodVersion) throw AppError.conflict('Food changed; save the draft again');
    })])));
    if (plan.state === 'DRAFT') {
      await PersonalPlanModel.updateOne({ _id: id, userId, revision: input.revision, state: 'DRAFT' }, { $set: { state: 'PUBLISHED' } });
      const published = await ownedPlan(userId, id);
      if (published.revision !== input.revision || published.state !== 'PUBLISHED') throw AppError.conflict('Draft changed; reload it');
    }
    const activation: Activation = { planId: id, effectiveFrom: plan.startDate, requestId: input.requestId, planRevision: input.revision };
    const last = state.activations.at(-1);
    if (last && last.effectiveFrom > plan.startDate) throw AppError.conflict('A later plan is pending; choose its start date or later');
    const result = await PersonalPlanStateModel.updateOne({ userId, revision: state.revision }, { $push: { activations: activation }, $inc: { revision: 1 } });
    if (result.modifiedCount) return getCurrent(userId);
  }
  throw AppError.conflict('Plan changed concurrently; retry the same request');
}
async function presentPlan(userId: string, id: string, today: string, activations: Activation[]) {
  const plan = await ownedPlan(userId, id);
  const [logs, activities] = await Promise.all([FoodLogModel.find({ userId, sourcePlanId: id }).lean(), ActivityLogModel.find({ userId, planId: id }).lean()]);
  const days = plan.days.map(day => ({ ...day,
    effective: onDate(activations, day.date)?.planId === id,
    activity: day.activity ? { ...day.activity,
      status: activities.find(a => a.activityId === day.activity!.id)?.status ?? (day.date < today ? 'MISSED' : 'PLANNED'),
      actualMinutes: activities.find(a => a.activityId === day.activity!.id)?.actualMinutes ?? 0,
      note: activities.find(a => a.activityId === day.activity!.id)?.note ?? '',
      revision: activities.find(a => a.activityId === day.activity!.id)?.revision ?? 0,
    } : null,
    meals: day.meals.map(m => ({ ...m, items: m.items.map(item => ({ ...item, logId: logs.find(l => l.sourcePlanItemId === item.id)?._id.toString() })) })),
  }));
  const currentTarget = await targetFor(userId, today).catch(() => null);
  return { ...plan.toJSON(), days, targetChanged: currentTarget && JSON.stringify(currentTarget) !== JSON.stringify(plan.targetSnapshot) };
}
export async function getCurrent(userId: string, date?: string) {
  const timezone = await getUserTimezone(userId);
  const today = todayInTimezone(timezone);
  const day = date ?? today;
  const state = await stateFor(userId);
  const active = onDate(state.activations, day);
  const current = active ? await presentPlan(userId, active.planId, today, state.activations) : null;
  const futureDates = [...new Set(state.activations.filter(a => a.effectiveFrom > day).map(a => a.effectiveFrom))].sort();
  const upcoming = await Promise.all(futureDates.map(date => presentPlan(userId, onDate(state.activations, date)!.planId, today, state.activations)));
  const pending = upcoming[0] ?? null;
  return { today, date: day, timezone, current, pending, upcoming, expired: !!current && current.endDate < day };
}
export async function getHistory(userId: string) {
  const state = await stateFor(userId);
  const ids = [...new Set(state.activations.map(a => a.planId))];
  const plans = await PersonalPlanModel.find({ userId, _id: { $in: ids } }).sort({ startDate: -1, createdAt: -1 });
  return plans.map(p => ({ id: p.id, startDate: p.startDate, endDate: p.endDate, sport: p.surveySnapshot.sport }));
}
export async function getHistoryPlan(userId: string, id: string) {
  const state = await stateFor(userId);
  if (!state.activations.some(a => a.planId === id)) throw AppError.notFound('Applied plan not found');
  return presentPlan(userId, id, todayInTimezone(await getUserTimezone(userId)), state.activations);
}
async function loggablePlan(userId: string, id: string, date: string) {
  const state = await stateFor(userId);
  if (onDate(state.activations, date)?.planId !== id) throw AppError.conflict('This plan is not effective on that date');
  await resolveLogDate(userId, date);
}
export async function logActivity(userId: string, id: string, activityId: string, input: z.infer<typeof activityLogSchema>) {
  const plan = await ownedPlan(userId, id);
  const day = plan.days.find(d => d.activity?.id === activityId);
  if (!day?.activity) throw AppError.notFound('Activity not found');
  await loggablePlan(userId, id, day.date);
  const filter = { userId, planId: id, activityId };
  const value = { date: day.date, sport: day.activity.sport, status: input.status, actualMinutes: input.actualMinutes, note: input.note, revision: input.revision + 1 };
  if (input.revision === 0) {
    try { return (await ActivityLogModel.create({ ...filter, ...value })).toJSON(); }
    catch (error) { if (duplicate(error)) throw AppError.conflict('Activity log changed; reload it'); throw error; }
  }
  const log = await ActivityLogModel.findOneAndUpdate({ ...filter, revision: input.revision }, { $set: value }, { new: true });
  if (!log) throw AppError.conflict('Activity log changed; reload it');
  return log.toJSON();
}
export async function logItem(userId: string, id: string, itemId: string, input: z.infer<typeof itemLogSchema>) {
  const plan = await ownedPlan(userId, id);
  const day = plan.days.find(d => d.meals.some(m => m.items.some(i => i.id === itemId)));
  const item = day?.meals.flatMap(m => m.items).find(i => i.id === itemId);
  if (!day || !item) throw AppError.notFound('Planned food not found');
  await loggablePlan(userId, id, day.date);
  const filter = { userId, sourcePlanId: id, sourcePlanItemId: itemId };
  const previous = await FoodLogModel.findOne(filter);
  if (previous) return previous.toJSON();
  await resolveMeal(userId, input.mealType);
  const food = await getVisibleFood(userId, item.foodId);
  if (foodVersion(food) !== input.foodVersion) throw AppError.conflict('Food changed; review nutrition and confirm again');
  try { return (await FoodLogModel.create({ ...buildFoodLog(userId, day.date, input.mealType, food, input.quantity), ...filter })).toJSON(); }
  catch (error) { if (!duplicate(error)) throw error; return (await FoodLogModel.findOne(filter))!.toJSON(); }
}
