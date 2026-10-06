import { AppError } from '../../utils/AppError';
// Deployment operator must obtain explicit consent before enabling new PT data sharing.
// Tests may enable this object while replacing llm.generateJson with a mock.
export const coachConsent = { enabled: process.env.COACH_AI_DATA_SHARING_CONSENT === 'true' };
export function requireCoachConsent() {
  if (!coachConsent.enabled) throw new AppError(503, 'AI PT data sharing is disabled pending explicit consent');
}
