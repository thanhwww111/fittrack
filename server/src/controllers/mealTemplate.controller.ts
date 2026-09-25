import type { RequestHandler } from "express";
import * as mealTemplateService from "../services/mealTemplate.service";

export const listMealTemplates: RequestHandler = async (req, res) => {
  const data = await mealTemplateService.listMealTemplates(req.user!.id);
  res.json({ success: true, data });
};

export const createMealTemplate: RequestHandler = async (req, res) => {
  const data = await mealTemplateService.createMealTemplate(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const createFromMeal: RequestHandler = async (req, res) => {
  const data = await mealTemplateService.createFromMeal(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const updateMealTemplate: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await mealTemplateService.updateMealTemplate(req.user!.id, req.params.id, req.body);
  res.json({ success: true, data });
};

export const deleteMealTemplate: RequestHandler<{ id: string }> = async (req, res) => {
  await mealTemplateService.deleteMealTemplate(req.user!.id, req.params.id);
  res.status(204).end();
};

export const applyMealTemplate: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await mealTemplateService.applyMealTemplate(req.user!.id, req.params.id, req.body);
  res.status(201).json({ success: true, data });
};
