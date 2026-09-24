import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Lỗi mình chủ động throw
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
    return;
  }

  // Lỗi validate từ Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: err.issues.map((i) => ({
          path: i.path.map(String).join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  // ID MongoDB sai định dạng
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: { message: `Invalid ${err.path}: ${err.value}` },
    });
    return;
  }

  // Lỗi validate từ Mongoose schema
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: Object.values(err.errors).map((e) => ({
          path: e.path,
          message: e.message,
        })),
      },
    });
    return;
  }

  // Trùng unique key, ví dụ email đã tồn tại
  if (err?.code === 11000) {
    res.status(409).json({
      success: false,
      error: { message: "Duplicate value", details: err.keyValue },
    });
    return;
  }

  // Client gửi JSON hỏng
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { message: "Invalid JSON body" },
    });
    return;
  }

  // Lỗi không lường trước
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  });
};