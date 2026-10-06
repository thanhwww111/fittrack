import { Schema, model, Types } from 'mongoose';
import { applyToJSON } from '../utils/toJSON';
import type { SurveyInput } from '../schemas/personalPlan.schema';
import type { PlanDay, TargetSnapshot } from '../utils/personalPlan';
export interface SurveyDocument { userId: Types.ObjectId; revision: number; payload: SurveyInput }
const survey = new Schema<SurveyDocument>({ userId: { type: Schema.Types.ObjectId, required: true, unique: true }, revision: { type: Number, default: 0 }, payload: { type: Schema.Types.Mixed, required: true } }, { timestamps: true });
applyToJSON(survey);
export const LifestyleSurveyModel = model('LifestyleSurvey', survey);
export interface PlanDocument { userId: Types.ObjectId; revision: number; state: 'DRAFT' | 'PUBLISHED'; requestId: string; requestStartDate?: string; generatorVersion: string; coachSummary?: string; timezone: string; startDate: string; endDate: string; sourceSurveyRevision: number; surveySnapshot: SurveyInput; targetSnapshot: TargetSnapshot; days: PlanDay[] }
const plan = new Schema<PlanDocument>({ userId: { type: Schema.Types.ObjectId, required: true }, revision: { type: Number, default: 0 }, state: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' }, requestId: { type: String, required: true }, requestStartDate: String, generatorVersion: String, coachSummary: String, timezone: String, startDate: String, endDate: String, sourceSurveyRevision: Number, surveySnapshot: Schema.Types.Mixed, targetSnapshot: Schema.Types.Mixed, days: [Schema.Types.Mixed] }, { timestamps: true });
plan.index({ userId: 1, requestId: 1 }, { unique: true });
applyToJSON(plan);
export const PersonalPlanModel = model('PersonalPlan', plan);
export interface Activation { planId: string; effectiveFrom: string; requestId: string; planRevision: number }
export interface PlanState { userId: Types.ObjectId; revision: number; activations: Activation[] }
const state = new Schema<PlanState>({ userId: { type: Schema.Types.ObjectId, required: true, unique: true }, revision: { type: Number, default: 0 }, activations: [new Schema({ planId: String, effectiveFrom: String, requestId: String, planRevision: Number }, { _id: false })] });
export const PersonalPlanStateModel = model('PersonalPlanState', state);
const activity = new Schema({ userId: { type: Schema.Types.ObjectId, required: true }, planId: { type: String, required: true }, activityId: { type: String, required: true }, date: String, sport: String, status: { type: String, enum: ['COMPLETED', 'SKIPPED'] }, actualMinutes: Number, note: String, revision: { type: Number, default: 1 } }, { timestamps: true });
activity.index({ userId: 1, planId: 1, activityId: 1 }, { unique: true });
applyToJSON(activity);
export const ActivityLogModel = model('ActivityLog', activity);
