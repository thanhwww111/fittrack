import { Router } from "express";
import * as workout from "../controllers/workout.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import {
  createExerciseSchema,
  createTemplateSchema,
  recordSetSchema,
  startSessionSchema,
  updateExerciseSchema,
  updateSessionSchema,
  updateTemplateSchema,
} from "../schemas/workout.schema";

export const exerciseRoutes = Router()
  .use(authenticate)
  .get("/", workout.listExercises)
  .get("/:id", workout.getExercise)
  .get("/:id/history", workout.getExerciseHistory)
  .post("/", validateBody(createExerciseSchema), workout.createExercise)
  .put("/:id", validateBody(updateExerciseSchema), workout.updateExercise)
  .delete("/:id", workout.deleteExercise);

export const workoutTemplateRoutes = Router()
  .use(authenticate)
  .get("/", workout.listTemplates)
  .get("/:id", workout.getTemplate)
  .post("/", validateBody(createTemplateSchema), workout.createTemplate)
  .put("/:id", validateBody(updateTemplateSchema), workout.updateTemplate)
  .delete("/:id", workout.deleteTemplate)
  .post("/:id/duplicate", workout.duplicateTemplate);

export const workoutSessionRoutes = Router()
  .use(authenticate)
  .get("/", workout.listSessions)
  .get("/active", workout.getActiveSession)
  .get("/today", workout.getTodayWorkout)
  .get("/:id", workout.getSession)
  .post("/", validateBody(startSessionSchema), workout.startSession)
  .post("/:id/sets", validateBody(recordSetSchema), workout.recordSet)
  .delete("/:id/exercises/:exerciseId/sets/:setNumber", workout.removeSet)
  .post("/:id/complete", workout.completeSession)
  .post("/:id/cancel", workout.cancelSession)
  .patch("/:id", validateBody(updateSessionSchema), workout.updateSession)
  .delete("/:id", workout.deleteSession);

export const personalRecordRoutes = Router()
  .use(authenticate)
  .get("/", workout.listPersonalRecords);
