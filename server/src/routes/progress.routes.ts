import { Router } from "express";
import * as progress from "../controllers/progress.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { upsertMeasurementSchema } from "../schemas/progress.schema";

export const bodyMeasurementRoutes = Router()
  .use(authenticate)
  .get("/", progress.listMeasurements)
  .post("/", validateBody(upsertMeasurementSchema), progress.upsertMeasurement)
  .delete("/:id", progress.deleteMeasurement);

export const progressRoutes = Router()
  .use(authenticate)
  .get("/weight", progress.getWeight)
  .get("/workout", progress.getWorkout)
  .get("/nutrition", progress.getNutrition)
  .get("/weekly", progress.getWeekly);
