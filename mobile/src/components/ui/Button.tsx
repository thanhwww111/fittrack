import { ActivityIndicator, Pressable, Text, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing, themedStyles } from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  // light: nút trắng đặt trên nền gradient
  variant?: "primary" | "secondary" | "danger" | "light";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor =
    variant === "secondary"
      ? colors.primaryText
      : variant === "light"
        ? colors.gradientEnd
        : colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === "primary" && !isDisabled && shadow(1),
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  base: {
    minHeight: 50,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.danger },
  light: { backgroundColor: colors.onGradient },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
}));
