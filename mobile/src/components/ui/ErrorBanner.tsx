import { Text, View } from "react-native";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { localizeMessage, useTranslation } from "@/i18n";

export function ErrorBanner({ message }: { message: string | null }) {
  const { locale } = useTranslation();
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{localizeMessage(locale, message)}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { maxWidth: "100%", flexShrink: 1, color: colors.danger, fontSize: 14 },
}));
