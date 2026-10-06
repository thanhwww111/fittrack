import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export type Locale = "vi" | "en";
const KEY = "fittrack.language";
let revision = 0;
let pendingWrite = Promise.resolve();
interface LanguageState {
  locale: Locale;
  hydrated: boolean;
  storageError: boolean;
  hydrate: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
}
// Device preference, intentionally retained when an account logs out.
export const useLanguageStore = create<LanguageState>((set) => ({
  locale: "vi", hydrated: false, storageError: false,
  hydrate: async () => {
    const version = revision;
    try {
      const saved = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
      if (version === revision) set({ locale: saved === "en" ? "en" : "vi", hydrated: true });
    } catch { if (version === revision) set({ hydrated: true }); }
  },
  setLocale: async (locale) => {
    if (locale !== "vi" && locale !== "en") return;
    const version = ++revision;
    set({ locale, hydrated: true, storageError: false });
    pendingWrite = pendingWrite.then(async () => {
      try {
        if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, locale);
        else await SecureStore.setItemAsync(KEY, locale);
      } catch { if (version === revision) set({ storageError: true }); }
    });
    await pendingWrite;
  },
}));
