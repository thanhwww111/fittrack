import type { ApiSuccess } from "@/types/api";
import type { AuthResult, User, UserProfile } from "@/types/models";
import { api, unwrap } from "./client";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    unwrap(api.post<ApiSuccess<AuthResult>>("/auth/register", input)),

  login: (input: LoginInput) => unwrap(api.post<ApiSuccess<AuthResult>>("/auth/login", input)),

  logout: (refreshToken: string) =>
    unwrap(api.post<ApiSuccess<null>>("/auth/logout", { refreshToken })),

  me: () => unwrap(api.get<ApiSuccess<{ user: User; profile: UserProfile | null }>>("/auth/me")),
};

export const accountApi = {
  updateMe: (input: { name: string }) => unwrap(api.patch<ApiSuccess<User>>("/auth/me", input)),

  // Server thu hồi mọi phiên cũ và trả về token mới cho máy này
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    unwrap(api.post<ApiSuccess<AuthResult>>("/auth/change-password", input)),

  deleteAccount: async (password: string) => {
    await api.delete("/auth/me", { data: { password } });
  },
};
