import { Router } from "express";
import * as goalController from "../controllers/goal.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { createGoalSchema, updateGoalSchema } from "../schemas/goal.schema";

const router = Router();

router.use(authenticate);

router.get("/", goalController.listGoals);
router.get("/suggestion", goalController.getSuggestion);
router.get("/recalculation", goalController.getRecalculation);
router.post("/", validateBody(createGoalSchema), goalController.createGoal);
router.put("/:id", validateBody(updateGoalSchema), goalController.updateGoal);

export default router;
