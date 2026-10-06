import { z } from 'zod';
import { isValidDateString } from '../utils/date';
const id = z.string().regex(/^[a-f\d]{24}$/i);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const revision = z.number().int().min(0);
const daySlot = z.object({ dayOfWeek: z.number().int().min(1).max(7), time, durationMinutes: z.number().int().min(10).max(90) });
export const surveySchema = z.object({
  revision, sport: z.enum(['YOGA', 'WALKING']), experience: z.enum(['BEGINNER', 'REGULAR']),
  availableDays: z.array(daySlot).min(1).max(7).refine(days => new Set(days.map(d => d.dayOfWeek)).size === days.length, 'Duplicate days'),
  mealTimes: z.array(z.object({ mealId: z.string().min(1).max(80), time })).min(3).max(8).refine(meals => new Set(meals.map(m => m.mealId)).size === meals.length, 'Duplicate meals').refine(meals => ['BREAKFAST', 'LUNCH', 'DINNER'].every(id => meals.some(meal => meal.mealId === id)), 'Breakfast, lunch and dinner are required'),
  preferredFoodIds: z.array(id).max(50), excludedFoodIds: z.array(id).max(50), remindersEnabled: z.boolean().default(false),
}).refine(s => !s.preferredFoodIds.some(id => s.excludedFoodIds.includes(id)), 'A food cannot be preferred and excluded');
export type SurveyInput = z.infer<typeof surveySchema>;
export const dateSchema = z.string().refine(isValidDateString, 'Invalid date');
export const draftSchema = z.object({ requestId: z.string().min(1).max(100), startDate: dateSchema.optional() });
export const applySchema = z.object({ revision, requestId: z.string().min(1).max(100) });
export const planEditSchema = z.object({ revision, days: z.array(z.object({
  date: dateSchema,
  activity: z.object({ id: id, time, plannedMinutes: z.number().int().min(10).max(90) }).nullable(),
  meals: z.array(z.object({ mealId: z.string().min(1).max(80), time, items: z.array(z.object({
    id, foodId: id, quantity: z.number().finite().min(0.01).max(10000),
  })).max(12) })).min(1).max(8),
})).length(7) });
export const activityLogSchema = z.object({ revision, status: z.enum(['COMPLETED', 'SKIPPED']), actualMinutes: z.number().int().min(0).max(1440), note: z.string().max(500).default('') })
  .refine(i => i.status !== 'COMPLETED' || i.actualMinutes > 0, 'Completed activities need actual minutes');
export const itemLogSchema = z.object({ quantity: z.number().finite().min(0.01).max(10000), mealType: z.string().min(1).max(80), foodVersion: z.string().min(1).max(1000) });
export const objectIdSchema = id;
