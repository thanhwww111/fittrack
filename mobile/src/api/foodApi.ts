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

  // Món ghi gần đây nhất, mỗi món một lần
  recent: (limit = 10) =>
    unwrap(api.get<ApiSuccess<Food[]>>("/foods/recent", { params: { limit } })),

  favorites: () => unwrap(api.get<ApiSuccess<Food[]>>("/foods/favorites")),

  setFavorite: async (id: string, favorite: boolean) => {
    if (favorite) await api.put(`/foods/${id}/favorite`);
    else await api.delete(`/foods/${id}/favorite`);
  },

  get: (id: string) => unwrap(api.get<ApiSuccess<Food>>(`/foods/${id}`)),

  create: (input: CreateFoodInput) => unwrap(api.post<ApiSuccess<Food>>("/foods", input)),

  // Chỉ sửa/xoá được món do chính user tạo. Log cũ giữ nguyên vì đã lưu snapshot.
  update: (id: string, input: Partial<CreateFoodInput>) =>
    unwrap(api.put<ApiSuccess<Food>>(`/foods/${id}`, input)),

  remove: async (id: string) => {
    await api.delete(`/foods/${id}`);
  },
};
