import type { RequestHandler } from "express";
import { listFoodsQuerySchema, recentFoodsQuerySchema } from "../schemas/food.schema";
import * as foodService from "../services/food.service";

export const listFoods: RequestHandler = async (req, res) => {
  const query = listFoodsQuerySchema.parse(req.query);
  const data = await foodService.listFoods(req.user!.id, query);
  res.json({ success: true, data });
};

export const getFood: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await foodService.getFood(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const createFood: RequestHandler = async (req, res) => {
  const data = await foodService.createFood(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const updateFood: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await foodService.updateFood(req.user!.id, req.params.id, req.body);
  res.json({ success: true, data });
};

export const deleteFood: RequestHandler<{ id: string }> = async (req, res) => {
  await foodService.deleteFood(req.user!.id, req.params.id);
  res.status(204).end();
};

export const listRecentFoods: RequestHandler = async (req, res) => {
  const { limit } = recentFoodsQuerySchema.parse(req.query);
  const data = await foodService.listRecentFoods(req.user!.id, limit);
  res.json({ success: true, data });
};
