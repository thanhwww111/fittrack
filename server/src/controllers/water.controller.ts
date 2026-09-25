import type { RequestHandler } from "express";
import { waterQuerySchema } from "../schemas/water.schema";
import * as waterService from "../services/water.service";

export const getWater: RequestHandler = async (req, res) => {
  const { date } = waterQuerySchema.parse(req.query);
  const data = await waterService.getWater(req.user!.id, date);
  res.json({ success: true, data });
};

export const addWater: RequestHandler = async (req, res) => {
  const data = await waterService.addWater(req.user!.id, req.body);
  res.json({ success: true, data });
};

export const setWater: RequestHandler = async (req, res) => {
  const data = await waterService.setWater(req.user!.id, req.body);
  res.json({ success: true, data });
};
