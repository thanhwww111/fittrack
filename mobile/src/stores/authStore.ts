import { create } from "zustand";
import { authApi, type LoginInput, type RegisterInput } from "@/api/authApi";
import { configureAuth } from "@/api/client";
import { clearRefreshToken, getRefreshToken, setRefreshToken } from "@/lib/tokenStorage";
import type { AuthResult, User } from "@/types/models";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  // Access token chỉ giữ trong bộ nhớ, refresh token nằm trong SecureStore
  accessToken: string | null;
  isAuthenticated: boolean;

  bootstrap: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const signedOut = {
  status: "unauthenticated" as const,
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()((set, get) => {
  async function applyAuthResult(result: AuthResult) {
    await setRefreshToken(result.refreshToken);
    set({
      status: "authenticated",
      user: result.user,
      accessToken: result.accessToken,
      isAuthenticated: true,
    });
  }

  async function clearSession() {
    await clearRefreshToken();
    set(signedOut);
  }

  configureAuth({
    getAccessToken: () => get().accessToken,
    getRefreshToken,
    onTokensRefreshed: async ({ accessToken, refreshToken }) => {
      await setRefreshToken(refreshToken);
      set({ accessToken });
    },
    onSessionExpired: clearSession,
  });

  return {
    status: "loading",
    user: null,
    accessToken: null,
    isAuthenticated: false,

    // Mở app: nếu còn refresh token thì gọi /auth/me.
    // Chưa có access token nên request đầu bị 401, client sẽ tự refresh rồi gửi lại.
    bootstrap: async () => {
      if (!(await getRefreshToken())) {
        set(signedOut);
        return;
      }
      try {
        const { user } = await authApi.me();
        set({ status: "authenticated", user, isAuthenticated: true });
      } catch {
        await clearSession();
      }
    },

    login: async (input) => applyAuthResult(await authApi.login(input)),

    register: async (input) => applyAuthResult(await authApi.register(input)),

    logout: async () => {
      const refreshToken = await getRefreshToken();
      // Xoá phiên ở máy trước, gọi server thu hồi token sau: mất mạng vẫn đăng xuất được
      await clearSession();
      if (refreshToken) {
        authApi.logout(refreshToken).catch(() => {});
      }
    },
  };
});
