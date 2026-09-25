import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

// Server giả: access token hợp lệ là "fresh-access", mọi token khác bị 401
let refreshCalls = 0;
let refreshShouldFail = false;

const fakeServer: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const respond = (status: number, data: unknown) => {
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw new AxiosError("Request failed", String(status), config, null, response);
    }
    return response;
  };

  if (config.url === "/auth/refresh") {
    refreshCalls += 1;
    await new Promise((r) => setTimeout(r, 10));
    if (refreshShouldFail) return respond(401, { success: false, error: { message: "Invalid refresh token" } });
    return respond(200, {
      success: true,
      data: { accessToken: "fresh-access", refreshToken: `refresh-${refreshCalls}` },
    });
  }
  if (config.url === "/auth/login") {
    return respond(401, { success: false, error: { message: "Invalid email or password" } });
  }
  const auth = config.headers?.Authorization;
  if (auth !== "Bearer fresh-access") {
    return respond(401, { success: false, error: { message: "Invalid or expired access token" } });
  }
  return respond(200, { success: true, data: { url: config.url } });
};

// Instance trong client.ts được tạo lúc import, nên phải gắn adapter giả trước khi import
axios.defaults.adapter = fakeServer;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api, configureAuth, ApiError } = require("@/api/client") as typeof import("@/api/client");

let accessToken: string | null;
let storedRefresh: string | null;
let sessionExpired: boolean;

beforeEach(() => {
  refreshCalls = 0;
  refreshShouldFail = false;
  accessToken = "expired-access";
  storedRefresh = "refresh-0";
  sessionExpired = false;
  configureAuth({
    getAccessToken: () => accessToken,
    getRefreshToken: async () => storedRefresh,
    onTokensRefreshed: async (tokens) => {
      accessToken = tokens.accessToken;
      storedRefresh = tokens.refreshToken;
    },
    onSessionExpired: async () => {
      sessionExpired = true;
    },
  });
});

describe("api client token refresh", () => {
  it("refreshes once for concurrent 401s and retries every request", async () => {
    const results = await Promise.all([api.get("/profile"), api.get("/goals"), api.get("/auth/me")]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
    expect(storedRefresh).toBe("refresh-1");
  });

  it("refreshes for /auth/me so the app can restore a session on startup", async () => {
    accessToken = null;
    const res = await api.get("/auth/me");
    expect(res.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });

  it("does not refresh on a wrong password", async () => {
    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      status: 401,
      message: "Invalid email or password",
    });
    expect(refreshCalls).toBe(0);
  });

  it("expires the session when the refresh token is rejected", async () => {
    refreshShouldFail = true;
    const error = await api.get("/profile").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(sessionExpired).toBe(true);
  });
});
