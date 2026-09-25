import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes";
import foodRoutes from "./food.routes";
import foodLogRoutes from "./foodLog.routes";
import goalRoutes from "./goal.routes";
import profileRoutes from "./profile.routes";

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

export default router;