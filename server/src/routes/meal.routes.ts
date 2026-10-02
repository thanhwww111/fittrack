import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { createMealSchema } from "../schemas/meal.schema";
import { createMeal, listMeals } from "../services/meal.service";

const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
  res.json({ success: true, data: await listMeals(req.user!.id) });
});
router.post("/", validateBody(createMealSchema), async (req, res) => {
  res.status(201).json({ success: true, data: await createMeal(req.user!.id, req.body) });
});
export default router;
