import { Router } from "express";
import * as foodLogController from "../controllers/foodLog.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { createFoodLogSchema, updateFoodLogSchema } from "../schemas/foodLog.schema";

const router = Router();

router.use(authenticate);

router.get("/", foodLogController.listFoodLogs);
router.post("/", validateBody(createFoodLogSchema), foodLogController.createFoodLog);
router.put("/:id", validateBody(updateFoodLogSchema), foodLogController.updateFoodLog);
router.delete("/:id", foodLogController.deleteFoodLog);

export default router;
