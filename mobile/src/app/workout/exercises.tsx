import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { exerciseApi } from "@/api/workoutApi";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { CreateExerciseForm } from "@/components/workout/CreateExerciseForm";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { errorMessage } from "@/lib/formErrors";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, MUSCLE_ORDER } from "@/lib/workout";
import { useExercisePickerStore } from "@/stores/exercisePickerStore";
import type { Exercise, MuscleGroup } from "@/types/models";

interface Results {
  key: string | null; // bộ lọc mà `items` đang ứng với
  items: Exercise[];
}

export default function ExercisePickerScreen() {
  const onPick = useExercisePickerStore((s) => s.onPick);
  const selectedIds = useExercisePickerStore((s) => s.selectedIds);

  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const search = useDebouncedValue(query.trim());
  const key = `${muscle ?? ""}|${search}`;

  const [results, setResults] = useState<Results>({ key: null, items: [] });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    exerciseApi
      .list({ muscleGroup: muscle ?? undefined, search: search || undefined })
      .then((items) => {
        if (!cancelled) {
          setResults({ key, items });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResults({ key, items: [] });
          setError(errorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, muscle, search]);

  function pick(exercise: Exercise) {
    onPick?.(exercise);
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm bài tập"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          accessibilityLabel="Tìm bài tập"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterBar}
      >
        {[null, ...MUSCLE_ORDER].map((m) => {
          const selected = muscle === m;
          return (
            <Pressable
              key={m ?? "all"}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setMuscle(m)}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {m ? MUSCLE_LABELS[m] : "Tất cả"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ErrorBanner message={error} />

      {creating ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          <CreateExerciseForm
            initialName={query.trim()}
            initialMuscle={muscle}
            onSaved={pick}
            onCancel={() => setCreating(false)}
          />
        </ScrollView>
      ) : results.key !== key ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={results.items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const already = selectedIds.includes(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                disabled={already}
                onPress={() => pick(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed, already && styles.disabled]}
              >
                <View style={styles.flex}>
                  <Text style={styles.name}>
                    {item.name}
                    {item.isCustom ? <Text style={styles.badge}>  · Của bạn</Text> : null}
                  </Text>
                  <Text style={styles.muted}>
                    {MUSCLE_LABELS[item.muscleGroup]} · {EQUIPMENT_LABELS[item.equipment]}
                  </Text>
                </View>
                <Ionicons
                  name={already ? "checkmark-circle" : "add-circle-outline"}
                  size={24}
                  color={already ? colors.success : colors.primary}
                />
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Không tìm thấy bài tập nào.</Text>}
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() => setCreating(true)}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.createText}>Không có bài bạn cần? Tạo bài tập mới</Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 16, color: colors.text },
  filterBar: { flexGrow: 0 },
  filters: { gap: spacing.sm },
  filter: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 14, color: colors.text },
  filterTextSelected: { color: colors.onPrimary, fontWeight: "600" },
  loading: { marginTop: spacing.xl },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.xl },
  badge: { fontSize: 13, fontWeight: "500", color: colors.primary },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  createText: { fontSize: 15, fontWeight: "600", color: colors.primary },
}));
