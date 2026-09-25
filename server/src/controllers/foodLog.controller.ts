import type { RequestHandler } from "express";
import { listFoodLogsQuerySchema } from "../schemas/foodLog.schema";
import * as foodLogService from "../services/foodLog.service";

export const listFoodLogs: RequestHandler = async (req, res) => {
  const { date } = listFoodLogsQuerySchema.parse(req.query);
  const data = await foodLogService.listFoodLogs(req.user!.id, date);
  res.json({ success: true, data });
};

export const createFoodLog: RequestHandler = async (req, res) => {
  const data = await foodLogService.createFoodLog(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const updateFoodLog: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await foodLogService.updateFoodLog(req.user!.id, req.params.id, req.body);
  res.json({ success: true, data });
};

export const deleteFoodLog: RequestHandler<{ id: string }> = async (req, res) => {
  await foodLogService.deleteFoodLog(req.user!.id, req.params.id);
  res.status(204).end();
};
