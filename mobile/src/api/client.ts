import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorBody, ApiSuccess } from "@/types/api";
import type { AuthTokens } from "@/types/models";

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

// authStore đăng ký các hàm này lúc khởi động, để client không phải import store
// (tránh vòng import store → api → store)
interface AuthHandlers {
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  onTokensRefreshed: (tokens: AuthTokens) => Promise<void>;
  onSessionExpired: () => Promise<void>;
}

let authHandlers: AuthHandlers | null = null;

export function configureAuth(handlers: AuthHandlers) {
  authHandlers = handlers;
}

const config = {
  baseURL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
};

export const api = axios.create(config);

// Instance riêng không có interceptor, chỉ dùng để refresh token
const refreshClient = axios.create(config);

api.interceptors.request.use((request) => {
  const token = authHandlers?.getAccessToken();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

// Nhiều request cùng bị 401 thì chỉ refresh một lần, các request còn lại chờ chung
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (!authHandlers) return null;

  refreshPromise ??= (async () => {
    try {
      const refreshToken = await authHandlers!.getRefreshToken();
      if (!refreshToken) return null;

      const res = await refreshClient.post<ApiSuccess<AuthTokens>>("/auth/refresh", {
        refreshToken,
      });
      await authHandlers!.onTokensRefreshed(res.data.data);
      return res.data.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function toApiError(error: AxiosError<ApiErrorBody>) {
  if (error.response) {
    const body = error.response.data;
    return new ApiError(
      body?.error?.message ?? "Request failed",
      error.response.status,
      body?.error?.details
    );
  }
  if (error.code === "ECONNABORTED") {
    return new ApiError("Request timed out");
  }
  return new ApiError("Cannot connect to server");
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Các route này không dùng access token: 401 ở đây là sai mật khẩu / token,
// không phải access token hết hạn, nên không refresh. /auth/me thì vẫn refresh.
const NO_REFRESH_ROUTES = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const request = error.config as RetriableConfig | undefined;
    const skipRefresh = NO_REFRESH_ROUTES.includes(request?.url ?? "");

    // Access token hết hạn: refresh rồi gửi lại request đúng một lần
    if (error.response?.status === 401 && request && !request._retried && !skipRefresh) {
      request._retried = true;
      const newToken = await refreshAccessToken();

      if (newToken) {
        request.headers.Authorization = `Bearer ${newToken}`;
        return api(request);
      }
      await authHandlers?.onSessionExpired();
    }

    return Promise.reject(toApiError(error));
  }
);

// Rút gọn việc lấy `data` từ `{ success, data }`
export async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>) {
  const res = await promise;
  return res.data.data;
}
