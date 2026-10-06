import type { RequestHandler } from "express";
import * as profileService from "../services/profile.service";
import * as weeklyCheckInService from "../services/weeklyCheckIn.service";

export const getProfile: RequestHandler = async (req, res) => {
  const data = await profileService.getProfile(req.user!.id);
  res.json({ success: true, data });
};

export const updateProfile: RequestHandler = async (req, res) => {
  const data = await profileService.updateProfile(req.user!.id, req.body);
  res.json({ success: true, data });
};

export const getWeeklyCheckIn: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await weeklyCheckInService.getWeeklyCheckIn(req.user!.id) });
};
export const saveWeeklyCheckIn: RequestHandler = async (req, res) => {
  res.json({ success: true, data: await weeklyCheckInService.saveWeeklyCheckIn(req.user!.id, req.body) });
};
