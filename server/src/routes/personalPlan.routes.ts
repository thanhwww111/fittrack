import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validateBody } from '../middlewares/validate';
import * as c from '../controllers/personalPlan.controller';
import { surveySchema, draftSchema, applySchema, planEditSchema, activityLogSchema, itemLogSchema } from '../schemas/personalPlan.schema';
export default Router().use(authenticate)
  .get('/survey', c.survey).put('/survey', validateBody(surveySchema), c.saveSurvey)
  .post('/drafts', validateBody(draftSchema), c.createDraft)
  .get('/drafts/:id', c.draft).put('/drafts/:id', validateBody(planEditSchema), c.editDraft)
  .post('/drafts/:id/apply', validateBody(applySchema), c.apply)
  .get('/current', c.current).get('/history', c.history).get('/history/:id', c.historyPlan)
  .put('/:id/activities/:activityId/log', validateBody(activityLogSchema), c.logActivity)
  .post('/:id/items/:itemId/log', validateBody(itemLogSchema), c.logItem);
