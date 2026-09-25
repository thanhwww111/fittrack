import { Router } from "express";
import * as mealTemplateController from "../controllers/mealTemplate.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import {
  applyMealTemplateSchema,
  createMealTemplateSchema,
  mealTemplateFromMealSchema,
  updateMealTemplateSchema,
} from "../schemas/mealTemplate.schema";

const router = Router();

router.use(authenticate);

router.get("/", mealTemplateController.listMealTemplates);
router.post("/", validateBody(createMealTemplateSchema), mealTemplateController.createMealTemplate);
router.post(
  "/from-meal",
  validateBody(mealTemplateFromMealSchema),
  mealTemplateController.createFromMeal
);
router.put("/:id", validateBody(updateMealTemplateSchema), mealTemplateController.updateMealTemplate);
router.delete("/:id", mealTemplateController.deleteMealTemplate);
router.post("/:id/apply", validateBody(applyMealTemplateSchema), mealTemplateController.applyMealTemplate);

export default router;
