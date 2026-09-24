import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes";

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
// router.use("/profile", profileRoutes); // Phase 4
// router.use("/foods", foodRoutes);      // Phase 5

export default router;