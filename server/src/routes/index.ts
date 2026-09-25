import { Router } from "express";
import mongoose from "mongoose";
import aiRoutes from "./ai.routes";
import authRoutes from "./auth.routes";
import foodRoutes from "./food.routes";
import foodLogRoutes from "./foodLog.routes";
import goalRoutes from "./goal.routes";
import mealTemplateRoutes from "./mealTemplate.routes";
import { internalRoutes, notificationRoutes } from "./notification.routes";
import nutritionRoutes from "./nutrition.routes";
import profileRoutes from "./profile.routes";
import waterRoutes from "./water.routes";
import { bodyMeasurementRoutes, progressRoutes } from "./progress.routes";
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
router.use("/meal-templates", mealTemplateRoutes);
router.use("/nutrition", nutritionRoutes);
router.use("/water", waterRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/workout-templates", workoutTemplateRoutes);
router.use("/workout-sessions", workoutSessionRoutes);
router.use("/personal-records", personalRecordRoutes);
router.use("/body-measurements", bodyMeasurementRoutes);
router.use("/progress", progressRoutes);
router.use("/ai", aiRoutes);
router.use("/notifications", notificationRoutes);
router.use("/internal", internalRoutes);

export default router;