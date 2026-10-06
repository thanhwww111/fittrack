import { ApiError } from '@/api/client';
export function isFailedPlanGeneration(error: unknown): boolean {
  return error instanceof ApiError && typeof error.details === 'object' && error.details !== null && 'code' in error.details && error.details.code === 'PLAN_GENERATION_FAILED';
}
