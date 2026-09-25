import { Router } from "express";
import * as nutritionController from "../controllers/nutrition.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.get("/today", nutritionController.getToday);
router.get("/daily", nutritionController.getDaily); // ?date=YYYY-MM-DD

export default router;
