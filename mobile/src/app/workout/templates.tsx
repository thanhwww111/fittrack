import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing } from "@/constants/theme";
import { useWorkoutStore } from "@/stores/workoutStore";

export default function TemplatesScreen() {
  const templates = useWorkoutStore((s) => s.templates);
  const error = useWorkoutStore((s) => s.error);

  useFocusEffect(
    useCallback(() => {
      useWorkoutStore.getState().loadTemplates();
    }, [])
  );

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/workout/template", params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.exercises.length} bài ·{" "}
                {item.exercises.reduce((n, e) => n + e.targetSets, 0)} set
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Chưa có template nào. Tạo template để lưu sẵn bài tập và số set × rep cho mỗi buổi.
          </Text>
        }
      />
      <Button title="Tạo template mới" onPress={() => router.push("/workout/template")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },
  list: { gap: spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.6 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.xl, lineHeight: 21 },
});
