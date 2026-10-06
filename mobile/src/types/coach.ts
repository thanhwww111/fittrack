export interface CoachSettings {
  enabled: boolean; maxPerDay: 1 | 2 | 3 | 5; quietStart: string; quietEnd: string;
  language: 'vi' | 'en'; tone: 'GENTLE' | 'FIRM'; snoozedUntil: string | null;
}
export interface CoachMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }
export interface CoachTrainingDay { date: string; activity: 'GYM' | 'YOGA' | 'WALKING' | 'REST'; title: string; minutes: number; time: string | null; templateId: string | null; intensity: 'EASY' | 'MODERATE'; rationale: string }
export interface CoachOverview { settings: CoachSettings; today: string; dailyAdvice: string | null; weeklyReview: string | null; trainingProposal?: CoachTrainingDay[] | null; recentMessages: CoachMessage[] }
export interface CoachCheckIn { energy: number; difficulty: number; note: string }
export type CoachReviewKind = 'DAILY' | 'WEEKLY';
