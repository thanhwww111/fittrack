import type { RequestHandler } from "express";
import { dateRangeQuerySchema } from "../schemas/progress.schema";
import * as service from "../services/trainingSchedule.service";
export const get: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await service.getTrainingSchedule(req.user!.id, dateRangeQuerySchema.parse(req.query)) });
};
export const apply: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await service.applyTrainingSchedule(req.user!.id, req.body) });
};
export const start: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await service.startScheduledSession(req.user!.id) });
};
