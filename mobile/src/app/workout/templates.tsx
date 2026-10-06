import { translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { useWorkoutStore } from "@/stores/workoutStore";

export default function TemplatesScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
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
        ListHeaderComponent={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/workout/programs")}
            style={({ pressed }) => [styles.row, styles.programRow, pressed && styles.pressed]}
          >
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.name}>{t("Lịch tập theo tuần")}</Text>
              <Text style={styles.muted}>{t("Đề xuất sẵn Push/Pull/Legs, Upper/Lower, Full Body. Tạo xong có ngay template cho từng buổi.")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/workout/template", params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.muted}>{t("{value1} bài ·  {value2} set", { value1: item.exercises.length, value2: item.exercises.reduce((n, e) => n + e.targetSets, 0) })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("Chưa có template nào. Tạo template để lưu sẵn bài tập và số set × rep cho mỗi buổi.")}</Text>
        }
      />
      <Button title={t("Tạo template mới")} onPress={() => router.push("/workout/template")} />
    </View>
  );
}

const styles = themedStyles(() => ({
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
  programRow: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  pressed: { opacity: 0.6 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.xl, lineHeight: 21 },
}));
