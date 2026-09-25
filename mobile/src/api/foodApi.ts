import type { ApiSuccess } from "@/types/api";
import type { CreateFoodInput, Food, Paginated } from "@/types/models";
import { api, unwrap } from "./client";

export interface SearchFoodsParams {
  search?: string;
  scope?: "all" | "system" | "custom";
  page?: number;
  limit?: number;
}

export const foodApi = {
  search: (params: SearchFoodsParams) =>
    unwrap(api.get<ApiSuccess<Paginated<Food>>>("/foods", { params })),

  get: (id: string) => unwrap(api.get<ApiSuccess<Food>>(`/foods/${id}`)),

  create: (input: CreateFoodInput) => unwrap(api.post<ApiSuccess<Food>>("/foods", input)),
};
