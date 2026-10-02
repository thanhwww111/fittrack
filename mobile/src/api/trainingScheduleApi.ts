import { api, unwrap } from './client';
import type { ApiSuccess } from '@/types/api';
import type { WorkoutSession } from '@/types/models';
import type { TrainingScheduleResponse } from '@/types/trainingSchedule';
export const trainingScheduleApi = {
  get: (params: { from?: string; to?: string } = {}) => unwrap(api.get<ApiSuccess<TrainingScheduleResponse>>('/training-schedule', { params })),
  apply: (programId: string, requestId: string) => unwrap(api.put<ApiSuccess<TrainingScheduleResponse>>('/training-schedule', { programId, requestId })),
  start: () => unwrap(api.post<ApiSuccess<WorkoutSession>>('/training-schedule/start')),
};
