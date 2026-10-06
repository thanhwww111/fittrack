import { translate as t, useTranslation } from "@/i18n";
import { Text, View } from "react-native";
import { colors, spacing, themedStyles } from "@/constants/theme";

// Placeholder cho các tab sẽ làm ở Sprint sau
export function ComingSoon({ title, sprint }: { title: string; sprint: number }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{t("Màn hình này sẽ có ở Sprint {value1}", { value1: sprint })}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted },
}));
