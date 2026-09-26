import { Text, View } from "react-native";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { color: colors.danger, fontSize: 14 },
}));
