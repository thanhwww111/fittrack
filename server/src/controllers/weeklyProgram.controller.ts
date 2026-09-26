import type { RequestHandler } from "express";
import * as programService from "../services/weeklyProgram.service";

type IdParams = { id: string };

export const listPresets: RequestHandler = (_req, res) => {
  res.json({ success: true, data: programService.listPresets() });
};

export const applyPreset: RequestHandler<{ key: string }> = async (req, res) => {
  const data = await programService.applyPreset(req.user!.id, req.params.key);
  res.status(201).json({ success: true, data });
};

export const listPrograms: RequestHandler = async (req, res) => {
  const data = await programService.listPrograms(req.user!.id);
  res.json({ success: true, data });
};

export const getProgram: RequestHandler<IdParams> = async (req, res) => {
  const data = await programService.getProgram(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const createProgram: RequestHandler = async (req, res) => {
  const data = await programService.createProgram(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const updateProgram: RequestHandler<IdParams> = async (req, res) => {
  const data = await programService.updateProgram(req.user!.id, req.params.id, req.body);
  res.json({ success: true, data });
};

export const addFavorite: RequestHandler<IdParams> = async (req, res) => {
  const data = await programService.setFavorite(req.user!.id, req.params.id, true);
  res.json({ success: true, data });
};

export const removeFavorite: RequestHandler<IdParams> = async (req, res) => {
  const data = await programService.setFavorite(req.user!.id, req.params.id, false);
  res.json({ success: true, data });
};

export const deleteProgram: RequestHandler<IdParams> = async (req, res) => {
  await programService.deleteProgram(req.user!.id, req.params.id);
  res.status(204).end();
};
