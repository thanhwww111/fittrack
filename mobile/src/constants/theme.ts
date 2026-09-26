import { StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

// Phong cách năng động cam → đỏ. Primary cam đậm để chữ trắng trên nút vẫn đọc rõ;
// gradient dùng cho thẻ hero / thẻ nổi bật.
const light = {
  primary: "#EA580C",
  primaryPressed: "#C2410C",
  primarySoft: "#FFEDD5",
  // Chữ màu primary trên nền primarySoft (nút phụ, chip)
  primaryText: "#C2410C",
  gradientStart: "#FF7A3D",
  gradientEnd: "#F43F5E",
  // Chữ / vòng trên nền gradient
  onGradient: "#FFFFFF",
  onGradientMuted: "rgba(255, 255, 255, 0.82)",
  onGradientTrack: "rgba(255, 255, 255, 0.28)",
  background: "#FAF7F5",
  surface: "#FFFFFF",
  // Ô số liệu nhỏ, nền phụ bên trong thẻ
  surfaceMuted: "#F6F0EC",
  border: "#EFE6E0",
  shadow: "#7C2D12",
  text: "#1C1917",
  textMuted: "#78716C",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  // Chữ trên nền primary / danger
  onPrimary: "#FFFFFF",
  // Nền đậm tương phản (thanh đếm giờ nghỉ)
  inverse: "#1C1917",
  // Thẻ kỷ lục cá nhân
  highlight: "#FEF3C7",
  highlightText: "#92400E",
  water: "#0EA5E9",
  waterSoft: "#E0F2FE",
  waterText: "#0369A1",
  protein: "#EF4444",
  carbs: "#F59E0B",
  fat: "#8B5CF6",
  streak: "#F97316",
  streakSoft: "#FFEDD5",
};

export type Palette = typeof light;

const dark: Palette = {
  primary: "#FB923C",
  primaryPressed: "#F97316",
  primarySoft: "#3A2215",
  primaryText: "#FDBA74",
  gradientStart: "#F97316",
  gradientEnd: "#E11D48",
  onGradient: "#FFFFFF",
  onGradientMuted: "rgba(255, 255, 255, 0.82)",
  onGradientTrack: "rgba(255, 255, 255, 0.25)",
  background: "#110D0B",
  surface: "#1C1613",
  surfaceMuted: "#271F1B",
  border: "#312721",
  shadow: "#000000",
  text: "#F5F0EB",
  textMuted: "#A8A29E",
  danger: "#F87171",
  dangerSoft: "#3F1D1D",
  success: "#4ADE80",
  successSoft: "#14351F",
  // Primary / danger bản tối là màu sáng → chữ tối mới đủ tương phản
  onPrimary: "#1C1917",
  inverse: "#292019",
  highlight: "#3D2F0B",
  highlightText: "#FCD34D",
  water: "#38BDF8",
  waterSoft: "#0C2D42",
  waterText: "#7DD3FC",
  protein: "#F87171",
  carbs: "#FBBF24",
  fat: "#A78BFA",
  streak: "#FB923C",
  streakSoft: "#3A2215",
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
  xl: 20,
  pill: 999,
} as const;

// Bóng đổ tạo chiều sâu cho thẻ. Android dùng elevation, iOS/web dùng shadow*.
export function shadow(level: 1 | 2 = 1) {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: level === 1 ? 0.06 : 0.14,
    shadowRadius: level === 1 ? 10 : 18,
    shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
    elevation: level === 1 ? 2 : 6,
  };
}
