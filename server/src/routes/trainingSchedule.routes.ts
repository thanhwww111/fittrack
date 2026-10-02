import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { applyTrainingScheduleSchema } from "../schemas/trainingSchedule.schema";
import * as controller from "../controllers/trainingSchedule.controller";
export default Router().use(authenticate)
  .get("/", controller.get)
  .put("/", validateBody(applyTrainingScheduleSchema), controller.apply)
  .post("/start", controller.start);
