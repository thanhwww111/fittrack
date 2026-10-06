import { api, unwrap } from './client';
import type { ApiSuccess } from '@/types/api';
import type { CoachSettings, CoachOverview, CoachMessage, CoachCheckIn, CoachReviewKind } from '@/types/coach';
export const coachApi = {
  opened: (jobId: string) => unwrap(api.post<ApiSuccess<unknown>>('/coach/opened', { jobId })),
  overview: () => unwrap(api.get<ApiSuccess<CoachOverview>>('/coach/overview')),
  settings: () => unwrap(api.get<ApiSuccess<CoachSettings>>('/coach/settings')),
  saveSettings: (settings: CoachSettings) => unwrap(api.put<ApiSuccess<CoachSettings>>('/coach/settings', settings)),
  messages: () => unwrap(api.get<ApiSuccess<CoachMessage[]>>('/coach/messages')),
  send: (requestId: string, text: string) => unwrap(api.post<ApiSuccess<CoachMessage>>('/coach/messages', { requestId, text })),
  checkIn: (input: CoachCheckIn) => unwrap(api.post<ApiSuccess<unknown>>('/coach/check-in', input)),
  review: (requestId: string, kind: CoachReviewKind) => unwrap(api.post<ApiSuccess<{ content: string }>>('/coach/review', { requestId, kind })),
};
