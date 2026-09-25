import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";
import { authLimiter } from "../middlewares/rateLimit";
import { validateBody } from "../middlewares/validate";
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateMeSchema,
} from "../schemas/auth.schema";

const router = Router();

router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/refresh", validateBody(refreshSchema), authController.refresh);
router.post("/logout", validateBody(refreshSchema), authController.logout);
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, validateBody(updateMeSchema), authController.updateMe);
// Cần mật khẩu hiện tại nên áp rate limit như login để chặn dò mật khẩu
router.post(
  "/change-password",
  authenticate,
  authLimiter,
  validateBody(changePasswordSchema),
  authController.changePassword
);
router.delete("/me", authenticate, authLimiter, validateBody(deleteAccountSchema), authController.deleteAccount);

export default router;
