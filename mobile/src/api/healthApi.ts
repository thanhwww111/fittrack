import { api } from "./client";
import type { ApiSuccess } from "@/types/api";

export interface HealthStatus {
  status: string;
  db: string;
}

export async function checkHealth() {
  const res = await api.get<ApiSuccess<HealthStatus>>("/health");
  return res.data.data;
}