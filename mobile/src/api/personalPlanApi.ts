import { api, unwrap } from './client';
import type { ApiSuccess } from '@/types/api';
import type { FoodLog } from '@/types/models';
import type { LifestyleSurvey, PersonalPlan, PersonalPlanResponse, PlanDay, PlanHistoryEntry } from '@/types/personalPlan';
const base = '/personal-plan';
export const personalPlanApi = {
  survey: () => unwrap(api.get<ApiSuccess<LifestyleSurvey | null>>(base + '/survey')),
  saveSurvey: (input: LifestyleSurvey) => unwrap(api.put<ApiSuccess<LifestyleSurvey>>(base + '/survey', input)),
  createDraft: (requestId: string, startDate?: string) => unwrap(api.post<ApiSuccess<PersonalPlan>>(base + '/drafts', { requestId, startDate })),
  draft: (id: string) => unwrap(api.get<ApiSuccess<PersonalPlan>>(`${base}/drafts/${id}`)),
  editDraft: (id: string, revision: number, days: PlanDay[]) => unwrap(api.put<ApiSuccess<PersonalPlan>>(`${base}/drafts/${id}`, { revision, days })),
  apply: (id: string, revision: number, requestId: string) => unwrap(api.post<ApiSuccess<PersonalPlanResponse>>(`${base}/drafts/${id}/apply`, { revision, requestId })),
  current: (date?: string) => unwrap(api.get<ApiSuccess<PersonalPlanResponse>>(base + '/current', { params: { date } })),
  history: () => unwrap(api.get<ApiSuccess<PlanHistoryEntry[]>>(base + '/history')),
  historyPlan: (id: string) => unwrap(api.get<ApiSuccess<PersonalPlan>>(`${base}/history/${id}`)),
  logActivity: (id: string, activityId: string, input: { revision: number; status: 'COMPLETED' | 'SKIPPED'; actualMinutes: number; note: string }) => unwrap(api.put<ApiSuccess<unknown>>(`${base}/${id}/activities/${activityId}/log`, input)),
  logItem: (id: string, itemId: string, input: { quantity: number; mealType: string; foodVersion: string }) => unwrap(api.post<ApiSuccess<FoodLog>>(`${base}/${id}/items/${itemId}/log`, input)),
};
