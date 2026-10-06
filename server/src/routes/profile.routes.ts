import { Router } from "express";
import * as profileController from "../controllers/profile.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { updateProfileSchema, weeklyCheckInSchema } from "../schemas/profile.schema";

const router = Router();

router.use(authenticate);
router.get("/weekly-check-in", profileController.getWeeklyCheckIn);
router.post("/weekly-check-in", validateBody(weeklyCheckInSchema), profileController.saveWeeklyCheckIn);

router.get("/", profileController.getProfile);
router.put("/", validateBody(updateProfileSchema), profileController.updateProfile);

export default router;
