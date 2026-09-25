import { StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  primary: "#2563eb",
  primaryPressed: "#1d4ed8",
  primarySoft: "#dbeafe",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  success: "#16a34a",
  successSoft: "#dcfce7",
  // Chữ trên nền primary / danger
  onPrimary: "#ffffff",
  // Nền đậm tương phản (thanh đếm giờ nghỉ)
  inverse: "#0f172a",
  // Thẻ kỷ lục cá nhân
  highlight: "#fef3c7",
  highlightText: "#92400e",
  water: "#0ea5e9",
  waterSoft: "#e0f2fe",
  waterText: "#0369a1",
  protein: "#ef4444",
  carbs: "#f59e0b",
  fat: "#8b5cf6",
};

export type Palette = typeof light;

const dark: Palette = {
  primary: "#3b82f6",
  primaryPressed: "#2563eb",
  primarySoft: "#1e3a5f",
  background: "#0b1220",
  surface: "#141d2f",
  border: "#27344b",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  danger: "#f87171",
  dangerSoft: "#3f1d1d",
  success: "#4ade80",
  successSoft: "#14351f",
  onPrimary: "#ffffff",
  // Nền đậm tương phản (thanh đếm giờ nghỉ)
  inverse: "#1e293b",
  highlight: "#3d2f0b",
  highlightText: "#fcd34d",
  water: "#38bdf8",
  waterSoft: "#0c2d42",
  waterText: "#7dd3fc",
  protein: "#f87171",
  carbs: "#fbbf24",
  fat: "#a78bfa",
};

const palettes: Record<ColorScheme, Palette> = { light, dark };

let activeScheme: ColorScheme = "light";

// Root layout gọi hàm này (trước khi render cây con) mỗi khi theme đổi
export function setActiveScheme(scheme: ColorScheme) {
  activeScheme = scheme;
}

export function getActiveScheme() {
  return activeScheme;
}

// `colors.x` luôn trả màu của theme đang dùng, nên code cũ (`colors.primary`...) giữ nguyên
export const colors: Palette = new Proxy({} as Palette, {
  get: (_target, key) => palettes[activeScheme][key as keyof Palette],
});

// Thay cho StyleSheet.create: mỗi theme tạo một bộ style riêng (lười, có cache).
// `styles.card` đọc bộ style của theme hiện tại tại thời điểm render.
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(factory: () => T): T {
  const cache: Partial<Record<ColorScheme, T>> = {};
  return new Proxy({} as T, {
    get: (_target, key) => {
      const sheet = (cache[activeScheme] ??= StyleSheet.create(factory()));
      return sheet[key as keyof T];
    },
  });
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
