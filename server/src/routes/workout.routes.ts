import { Router } from "express";
import * as workout from "../controllers/workout.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import {
  createExerciseSchema,
  createTemplateSchema,
  recordSetSchema,
  startSessionSchema,
  updateTemplateSchema,
} from "../schemas/workout.schema";

export const exerciseRoutes = Router()
  .use(authenticate)
  .get("/", workout.listExercises)
  .get("/:id", workout.getExercise)
  .post("/", validateBody(createExerciseSchema), workout.createExercise);

export const workoutTemplateRoutes = Router()
  .use(authenticate)
  .get("/", workout.listTemplates)
  .get("/:id", workout.getTemplate)
  .post("/", validateBody(createTemplateSchema), workout.createTemplate)
  .put("/:id", validateBody(updateTemplateSchema), workout.updateTemplate)
  .delete("/:id", workout.deleteTemplate);

export const workoutSessionRoutes = Router()
  .use(authenticate)
  .get("/", workout.listSessions)
  .get("/active", workout.getActiveSession)
  .get("/:id", workout.getSession)
  .post("/", validateBody(startSessionSchema), workout.startSession)
  .post("/:id/sets", validateBody(recordSetSchema), workout.recordSet)
  .delete("/:id/exercises/:exerciseId/sets/:setNumber", workout.removeSet)
  .post("/:id/complete", workout.completeSession)
  .post("/:id/cancel", workout.cancelSession);

export const personalRecordRoutes = Router()
  .use(authenticate)
  .get("/", workout.listPersonalRecords);
