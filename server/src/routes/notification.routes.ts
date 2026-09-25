import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authenticate } from "../middlewares/authenticate";
import { cronAuth } from "../middlewares/cronAuth";
import { validateBody } from "../middlewares/validate";
import {
  registerDeviceSchema,
  unregisterDeviceSchema,
  updateSettingsSchema,
} from "../schemas/notification.schema";

export const notificationRoutes = Router()
  .use(authenticate)
  .get("/settings", notificationController.getSettings)
  .put("/settings", validateBody(updateSettingsSchema), notificationController.updateSettings)
  .post("/devices", validateBody(registerDeviceSchema), notificationController.registerDevice)
  .delete("/devices", validateBody(unregisterDeviceSchema), notificationController.unregisterDevice);

// Gọi bởi cron (GitHub Actions) mỗi sáng thứ Hai
export const internalRoutes = Router()
  .use(cronAuth)
  .post("/weekly-report", notificationController.sendWeeklyReports);
