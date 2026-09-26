import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { sessionApi } from "@/api/workoutApi";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import { formatDate, formatDuration, formatVolume } from "@/lib/workout";
import type { WorkoutSession } from "@/types/models";

const PAGE_SIZE = 20;

export default function WorkoutHistoryScreen() {
  const [items, setItems] = useState<WorkoutSession[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await sessionApi.list({ status: "COMPLETED", page: nextPage, limit: PAGE_SIZE });
      setItems((prev) => (nextPage === 1 ? res.items : [...prev, ...res.items]));
      setPage(nextPage);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    sessionApi
      .list({ status: "COMPLETED", page: 1, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.items);
        setPage(1);
        setTotal(res.total);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  function loadMore() {
    if (!loading && total !== null && items.length < total) fetchPage(page + 1);
  }

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const sets = item.exercises.reduce((n, e) => n + e.sets.length, 0);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/workout/session", params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.date}>{formatDate(item.completedAt ?? item.startedAt)}</Text>
              </View>
              <Text style={styles.muted}>
                {item.exercises.length} bài · {sets} set · {formatVolume(item.totalVolume)} ·{" "}
                {formatDuration(item.duration)}
              </Text>
              <Text style={styles.exerciseList} numberOfLines={1}>
                {item.exercises.map((e) => e.exerciseName).join(", ")}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          total === null ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <Text style={styles.empty}>Chưa có buổi tập nào hoàn thành.</Text>
          )
        }
        ListFooterComponent={
          loading && items.length > 0 ? <ActivityIndicator color={colors.primary} /> : null
        }
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  date: { fontSize: 14, color: colors.textMuted },
  muted: { fontSize: 14, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  exerciseList: { fontSize: 13, color: colors.textMuted },
  loading: { marginTop: spacing.xl },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.xl },
}));
