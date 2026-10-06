import { z } from 'zod';
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const coachSettingsSchema = z.object({ enabled: z.boolean().default(false), maxPerDay: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)]).default(3), quietStart: time.default('22:00'), quietEnd: time.default('07:00'), tone: z.enum(['FIRM', 'GENTLE']).default('FIRM'), language: z.enum(['vi', 'en']).default('vi'), snoozedUntil: z.iso.datetime().nullable().default(null) }).strict();
export const coachSettingsUpdateSchema = coachSettingsSchema.partial();
export const coachMessageSchema = z.object({ requestId: z.string().min(1).max(100), text: z.string().trim().min(1).max(2000) }).strict();
export const coachCheckInSchema = z.object({ energy: z.number().int().min(1).max(5), difficulty: z.number().int().min(1).max(5), note: z.string().trim().max(1000).default('') }).strict();
export const coachReviewSchema = z.object({ requestId: z.string().min(1).max(100), kind: z.enum(['DAILY', 'WEEKLY']) }).strict();
export type CoachSettings = z.infer<typeof coachSettingsSchema>;
