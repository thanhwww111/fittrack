import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { listExercisesQuerySchema, listSessionsQuerySchema } from "../schemas/workout.schema";
import * as exerciseService from "../services/exercise.service";
import * as templateService from "../services/workoutTemplate.service";
import * as sessionService from "../services/workoutSession.service";

type IdParams = { id: string };

// ---------- Exercises ----------

export const listExercises: RequestHandler = async (req, res) => {
  const query = listExercisesQuerySchema.parse(req.query);
  const data = await exerciseService.listExercises(req.user!.id, query);
  res.json({ success: true, data });
};

export const getExercise: RequestHandler<IdParams> = async (req, res) => {
  const data = await exerciseService.getExercise(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const createExercise: RequestHandler = async (req, res) => {
  const data = await exerciseService.createExercise(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

// ---------- Templates ----------

export const listTemplates: RequestHandler = async (req, res) => {
  const data = await templateService.listTemplates(req.user!.id);
  res.json({ success: true, data });
};

export const getTemplate: RequestHandler<IdParams> = async (req, res) => {
  const data = await templateService.getTemplate(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const createTemplate: RequestHandler = async (req, res) => {
  const data = await templateService.createTemplate(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const updateTemplate: RequestHandler<IdParams> = async (req, res) => {
  const data = await templateService.updateTemplate(req.user!.id, req.params.id, req.body);
  res.json({ success: true, data });
};

export const deleteTemplate: RequestHandler<IdParams> = async (req, res) => {
  await templateService.deleteTemplate(req.user!.id, req.params.id);
  res.status(204).end();
};

// ---------- Sessions ----------

export const startSession: RequestHandler = async (req, res) => {
  const data = await sessionService.startSession(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
};

export const listSessions: RequestHandler = async (req, res) => {
  const query = listSessionsQuerySchema.parse(req.query);
  const data = await sessionService.listSessions(req.user!.id, query);
  res.json({ success: true, data });
};

export const getActiveSession: RequestHandler = async (req, res) => {
  const data = await sessionService.getActiveSession(req.user!.id);
  res.json({ success: true, data });
};

export const getSession: RequestHandler<IdParams> = async (req, res) => {
  const data = await sessionService.getSession(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const recordSet: RequestHandler<IdParams> = async (req, res) => {
  const data = await sessionService.recordSet(req.user!.id, req.params.id, req.body);
  res.status(201).json({ success: true, data });
};

export const removeSet: RequestHandler<IdParams & { exerciseId: string; setNumber: string }> =
  async (req, res) => {
    const setNumber = Number(req.params.setNumber);
    if (!Number.isInteger(setNumber) || setNumber < 1) {
      throw AppError.badRequest("setNumber must be a positive integer");
    }
    const data = await sessionService.removeSet(
      req.user!.id,
      req.params.id,
      req.params.exerciseId,
      setNumber
    );
    res.json({ success: true, data });
  };

export const completeSession: RequestHandler<IdParams> = async (req, res) => {
  const data = await sessionService.completeSession(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const cancelSession: RequestHandler<IdParams> = async (req, res) => {
  const data = await sessionService.cancelSession(req.user!.id, req.params.id);
  res.json({ success: true, data });
};

export const listPersonalRecords: RequestHandler = async (req, res) => {
  const data = await sessionService.listPersonalRecords(req.user!.id);
  res.json({ success: true, data });
};
