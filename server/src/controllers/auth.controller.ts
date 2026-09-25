import type { RequestHandler } from "express";
import * as authService from "../services/auth.service";

export const register: RequestHandler = async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, data });
};

export const login: RequestHandler = async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
};

export const refresh: RequestHandler = async (req, res) => {
  const data = await authService.refresh(req.body.refreshToken);
  res.json({ success: true, data });
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.json({ success: true, data: null });
};

export const me: RequestHandler = async (req, res) => {
  const data = await authService.getMe(req.user!.id);
  res.json({ success: true, data });
};

export const updateMe: RequestHandler = async (req, res) => {
  const data = await authService.updateMe(req.user!.id, req.body);
  res.json({ success: true, data });
};

export const changePassword: RequestHandler = async (req, res) => {
  const data = await authService.changePassword(req.user!.id, req.body);
  res.json({ success: true, data });
};

export const deleteAccount: RequestHandler = async (req, res) => {
  await authService.deleteAccount(req.user!.id, req.body.password);
  res.status(204).end();
};
