import { Router } from "express";
import * as waterController from "../controllers/water.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import { addWaterSchema, setWaterSchema } from "../schemas/water.schema";

const router = Router();

router.use(authenticate);

router.get("/", waterController.getWater); // ?date=YYYY-MM-DD
router.post("/add", validateBody(addWaterSchema), waterController.addWater);
router.put("/", validateBody(setWaterSchema), waterController.setWater);

export default router;
