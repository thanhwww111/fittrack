import { Router } from "express";
import * as program from "../controllers/weeklyProgram.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validate";
import {
  createWeeklyProgramSchema,
  updateWeeklyProgramSchema,
} from "../schemas/weeklyProgram.schema";

const router = Router();

router.use(authenticate);

// Route cố định đặt trước "/:id" để không bị hiểu nhầm là id
router.get("/presets", program.listPresets);
router.post("/presets/:key/apply", program.applyPreset);

router.get("/", program.listPrograms);
router.post("/", validateBody(createWeeklyProgramSchema), program.createProgram);
router.get("/:id", program.getProgram);
router.put("/:id", validateBody(updateWeeklyProgramSchema), program.updateProgram);
router.delete("/:id", program.deleteProgram);
router.put("/:id/favorite", program.addFavorite);
router.delete("/:id/favorite", program.removeFavorite);

export default router;
