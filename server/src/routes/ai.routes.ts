import { Router } from "express";
import * as aiController from "../controllers/ai.controller";
import { authenticate } from "../middlewares/authenticate";
import { aiLimiter } from "../middlewares/rateLimit";
import { validateBody } from "../middlewares/validate";
import { mealSuggestionInputSchema } from "../schemas/ai.schema";

const router = Router();

router.use(authenticate, aiLimiter);

// POST vì mỗi lần gọi tốn chi phí và kết quả khác nhau, không nên cache như GET
router.post("/meal-suggestions", validateBody(mealSuggestionInputSchema), aiController.suggestMeals);
router.post("/workout-analysis", aiController.analyzeWorkouts);

export default router;
