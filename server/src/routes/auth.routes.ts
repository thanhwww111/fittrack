import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";
import { authLimiter } from "../middlewares/rateLimit";
import { validateBody } from "../middlewares/validate";
import { loginSchema, refreshSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/refresh", validateBody(refreshSchema), authController.refresh);
router.post("/logout", validateBody(refreshSchema), authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
