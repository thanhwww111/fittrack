import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set in mobile/.env");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response) {
      const body = error.response.data;
      return Promise.reject(
        new ApiError(
          body?.error?.message ?? "Request failed",
          error.response.status,
          body?.error?.details
        )
      );
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(new ApiError("Request timed out"));
    }

    return Promise.reject(new ApiError("Cannot connect to server"));
  }
);