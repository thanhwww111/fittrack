import type { RequestHandler } from "express";
import * as goalService from "../services/goal.service";

export const listGoals: RequestHandler = async (req, res) => {
  const data = await goalService.listGoals(req.user!.id);
  res.json({ success: true, data });
};

export const getSuggestion: RequestHandler = async (req, res) => {
  const data = await goalService.getSuggestedTarget(req.user!.id);
  res.json({ success: true, data });
};

export const createGoal: RequestHandler = async (req, res) => {
  const data = await goalService.createGoal(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const updateGoal: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await goalService.updateGoal(req.user!.id, req.params.id, req.body);
  res.json({ success: true, data });
};
