import { useCallback } from "react";
import { useLanguageStore, type Locale } from "@/stores/languageStore";
import { coreMessages } from "./core";
import { profileMessages } from "./profile";
import { uiMessages } from "./messages";
import { personalPlanMessages } from "./personalPlan";
import { coachMessages } from "./coach";

export type TranslationParams = Record<string, string | number | null | undefined>;
export const englishMessages: Readonly<Record<string, string>> = { ...coreMessages, ...profileMessages, ...uiMessages, ...personalPlanMessages, ...coachMessages };
const vietnameseMessages = new Map(Object.entries(englishMessages).map(([vi, en]) => [en, vi]));
// Validation errors can already be in state when the language changes. Only known
// UI messages are converted; never use this on user-authored names or notes.
export function localizeMessage(locale: Locale, message: string): string {
  return translateFor(locale, vietnameseMessages.get(message) ?? message);
}
export function translateFor(locale: Locale, source: string, params?: TranslationParams): string {
  const message = locale === "en" && Object.hasOwn(englishMessages, source) ? englishMessages[source] : source;
  return message.replace(/\{(\w+)\}/g, (token, key: string) => params && key in params ? String(params[key] ?? "") : token);
}
export function translate(source: string, params?: TranslationParams): string {
  return translateFor(useLanguageStore.getState().locale, source, params);
}
export function localeTag(): "vi-VN" | "en-US" {
  return useLanguageStore.getState().locale === "en" ? "en-US" : "vi-VN";
}
export function useTranslation() {
  const locale = useLanguageStore(state => state.locale);
  const t = useCallback((source: string, params?: TranslationParams) => translateFor(locale, source, params), [locale]);
  return { t, locale, localeTag: locale === "en" ? "en-US" : "vi-VN" };
}
