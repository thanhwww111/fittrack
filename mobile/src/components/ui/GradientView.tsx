import { useId, type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors, radius, shadow } from "@/constants/theme";

interface GradientViewProps {
  children: ReactNode;
  style?: ViewStyle;
  from?: string;
  to?: string;
}

// Nền gradient chéo (mặc định cam → đỏ) vẽ bằng SVG, không cần thêm thư viện native
export function GradientView({ children, style, from = colors.gradientStart, to = colors.gradientEnd }: GradientViewProps) {
  // useId trả chuỗi có dấu ":", SVG id cần ký tự an toàn
  const id = `grad-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <View style={[styles.container, shadow(2), style]}>
      <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.xl },
  clip: { borderRadius: radius.xl, overflow: "hidden" },
});
