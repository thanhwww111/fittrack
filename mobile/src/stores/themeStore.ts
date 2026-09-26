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
  // Đổi theme làm root Stack dựng lại và về tab đầu: nhớ đường dẫn đang mở để quay lại
  returnPath: string | null;
  toggle: (current: "light" | "dark", returnPath: string) => void;
  // Lấy (một lần) đường dẫn cần quay lại sau khi đổi theme
  takeReturnPath: () => string | null;
}

// Lựa chọn giao diện lưu trên máy (không theo tài khoản), giữ nguyên khi đăng xuất
export const useThemeStore = create<ThemeState>()((set, get) => ({
  preference: "system",
  hydrated: false,
  returnPath: null,

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

  toggle: (current, returnPath) => {
    const next = current === "dark" ? "light" : "dark";
    set({ preference: next, returnPath });
    writePreference(next).catch(() => {});
  },

  takeReturnPath: () => {
    const path = get().returnPath;
    if (path) set({ returnPath: null });
    return path;
  },
}));
