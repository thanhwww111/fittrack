import type { RequestHandler } from "express";
import { dateRangeQuerySchema, weeksQuerySchema } from "../schemas/progress.schema";
import * as measurementService from "../services/bodyMeasurement.service";
import * as progressService from "../services/progress.service";

// ---------- Body measurements ----------

export const upsertMeasurement: RequestHandler = async (req, res) => {
  const { created, measurement } = await measurementService.upsertMeasurement(
    req.user!.id,
    req.body
  );
  res.status(created ? 201 : 200).json({ success: true, data: measurement });
};

export const listMeasurements: RequestHandler = async (req, res) => {
  const query = dateRangeQuerySchema.parse(req.query);
  const data = await measurementService.listMeasurements(req.user!.id, query);
  res.json({ success: true, data });
};

export const deleteMeasurement: RequestHandler<{ id: string }> = async (req, res) => {
  await measurementService.deleteMeasurement(req.user!.id, req.params.id);
  res.status(204).end();
};

// ---------- Progress ----------

export const getWeight: RequestHandler = async (req, res) => {
  const query = dateRangeQuerySchema.parse(req.query);
  const data = await progressService.getWeightProgress(req.user!.id, query);
  res.json({ success: true, data });
};

export const getWorkout: RequestHandler = async (req, res) => {
  const { weeks } = weeksQuerySchema.parse(req.query);
  const data = await progressService.getWorkoutProgress(req.user!.id, weeks);
  res.json({ success: true, data });
};

export const getNutrition: RequestHandler = async (req, res) => {
  const query = dateRangeQuerySchema.parse(req.query);
  const data = await progressService.getNutritionProgress(req.user!.id, query);
  res.json({ success: true, data });
};

export const getWeekly: RequestHandler = async (req, res) => {
  const data = await progressService.getWeeklySummary(req.user!.id);
  res.json({ success: true, data });
};
