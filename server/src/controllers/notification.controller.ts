import type { RequestHandler } from "express";
import * as notificationService from "../services/notification.service";

export const getSettings: RequestHandler = async (req, res) => {
  const data = await notificationService.getSettings(req.user!.id);
  res.json({ success: true, data });
};

export const updateSettings: RequestHandler = async (req, res) => {
  const data = await notificationService.updateSettings(req.user!.id, req.body);
  res.json({ success: true, data });
};

export const registerDevice: RequestHandler = async (req, res) => {
  await notificationService.registerDevice(req.user!.id, req.body);
  res.status(204).end();
};

export const unregisterDevice: RequestHandler = async (req, res) => {
  await notificationService.unregisterDevice(req.user!.id, req.body.token);
  res.status(204).end();
};

export const sendWeeklyReports: RequestHandler = async (_req, res) => {
  const data = await notificationService.sendWeeklyReports();
  res.json({ success: true, data });
};
