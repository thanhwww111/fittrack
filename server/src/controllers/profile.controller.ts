import type { RequestHandler } from "express";
import * as profileService from "../services/profile.service";

export const getProfile: RequestHandler = async (req, res) => {
  const data = await profileService.getProfile(req.user!.id);
  res.json({ success: true, data });
};

export const updateProfile: RequestHandler = async (req, res) => {
  const data = await profileService.updateProfile(req.user!.id, req.body);
  res.json({ success: true, data });
};
