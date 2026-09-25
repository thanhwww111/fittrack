import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

// Placeholder cho các tab sẽ làm ở Sprint sau
export function ComingSoon({ title, sprint }: { title: string; sprint: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Màn hình này sẽ có ở Sprint {sprint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted },
});
