import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_TOKEN_KEY = "fittrack.refreshToken";

// SecureStore không hỗ trợ web: khi chạy web (chỉ để dev) thì dùng localStorage
const isWeb = Platform.OS === "web";

export async function getRefreshToken() {
  if (isWeb) return globalThis.localStorage?.getItem(REFRESH_TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string) {
  if (isWeb) {
    globalThis.localStorage?.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken() {
  if (isWeb) {
    globalThis.localStorage?.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
