import { Router } from "express";
import * as profileController from "../controllers/profile.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { updateProfileSchema } from "../schemas/profile.schema";

const router = Router();

router.use(authenticate);

router.get("/", profileController.getProfile);
router.put("/", validateBody(updateProfileSchema), profileController.updateProfile);

export default router;
