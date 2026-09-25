import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

const KEY = "fittrack.theme";
const isWeb = Platform.OS === "web";

async function readPreference(): Promise<ThemePreference> {
  const value = isWeb
    ? (globalThis.localStorage?.getItem(KEY) ?? null)
    : await SecureStore.getItemAsync(KEY);
  return value === "light" || value === "dark" ? value : "system";
}

async function writePreference(value: ThemePreference) {
  if (isWeb) globalThis.localStorage?.setItem(KEY, value);
  else await SecureStore.setItemAsync(KEY, value);
}

interface ThemeState {
  preference: ThemePreference;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (value: ThemePreference) => void;
}

// Lựa chọn giao diện lưu trên máy (không theo tài khoản), giữ nguyên khi đăng xuất
export const useThemeStore = create<ThemeState>()((set) => ({
  preference: "system",
  hydrated: false,

  hydrate: async () => {
    try {
      set({ preference: await readPreference(), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setPreference: (value) => {
    set({ preference: value });
    writePreference(value).catch(() => {});
  },
}));
