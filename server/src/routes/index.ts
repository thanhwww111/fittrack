import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes";
import foodRoutes from "./food.routes";
import foodLogRoutes from "./foodLog.routes";
import goalRoutes from "./goal.routes";
import nutritionRoutes from "./nutrition.routes";
import profileRoutes from "./profile.routes";
import {
  exerciseRoutes,
  personalRecordRoutes,
  workoutSessionRoutes,
  workoutTemplateRoutes,
} from "./workout.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
  });
});

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/goals", goalRoutes);
router.use("/foods", foodRoutes);
router.use("/food-logs", foodLogRoutes);
router.use("/nutrition", nutritionRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/workout-templates", workoutTemplateRoutes);
router.use("/workout-sessions", workoutSessionRoutes);
router.use("/personal-records", personalRecordRoutes);

export default router;