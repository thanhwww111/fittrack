import type { RequestHandler } from "express";
import { listFoodLogsQuerySchema } from "../schemas/foodLog.schema";
import * as nutritionService from "../services/nutrition.service";

export const getToday: RequestHandler = async (req, res) => {
  const data = await nutritionService.getDailySummary(req.user!.id);
  res.json({ success: true, data });
};

export const getDaily: RequestHandler = async (req, res) => {
  const { date } = listFoodLogsQuerySchema.parse(req.query);
  const data = await nutritionService.getDailySummary(req.user!.id, date);
  res.json({ success: true, data });
};
