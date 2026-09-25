import type { RequestHandler } from "express";
import * as aiService from "../services/ai/ai.service";

export const suggestMeals: RequestHandler = async (req, res) => {
  const data = await aiService.suggestMeals(req.user!.id, req.body);
  res.json({ success: true, data });
};

export const analyzeWorkouts: RequestHandler = async (req, res) => {
  const data = await aiService.analyzeWorkouts(req.user!.id);
  res.json({ success: true, data });
};
