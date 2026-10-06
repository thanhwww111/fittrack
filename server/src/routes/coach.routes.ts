import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/authenticate';
import { cronAuth } from '../middlewares/cronAuth';
import { validateBody } from '../middlewares/validate';
import * as c from '../controllers/coach.controller';
import { coachSettingsUpdateSchema, coachMessageSchema, coachReviewSchema, coachCheckInSchema } from '../schemas/coach.schema';
export const coachRoutes = Router().use(authenticate)
  .get('/settings', c.settings).put('/settings', validateBody(coachSettingsUpdateSchema), c.updateSettings)
  .get('/overview', c.overview).get('/messages', c.messages)
  .post('/messages', validateBody(coachMessageSchema), c.chat)
  .post('/check-in', validateBody(coachCheckInSchema), c.checkIn)
  .post('/review', validateBody(coachReviewSchema), c.review)
  .post('/opened', validateBody(z.object({ jobId: z.string().regex(/^[a-f\d]{24}$/i) }).strict()), c.open);
export const coachInternalRoutes = Router().use(cronAuth).post('/coach-tick', c.tick);
