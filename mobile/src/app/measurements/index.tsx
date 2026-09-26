import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { measurementApi } from "@/api/progressApi";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { localToday } from "@/hooks/useProgress";
import { errorMessage } from "@/lib/formErrors";
import { measurementSummary } from "@/lib/measurements";
import { formatDayLabel } from "@/lib/nutrition";
import type { BodyMeasurement } from "@/types/models";

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

// Toàn bộ lịch sử đo, mới nhất lên đầu. Bấm vào một dòng để sửa hoặc xoá.
export default function MeasurementsScreen() {
  const [items, setItems] = useState<BodyMeasurement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      measurementApi
        .list()
        .then((list) => {
          setItems([...list].reverse());
          setError(null);
        })
        .catch((err) => setError(errorMessage(err)));
    }, [])
  );

  const today = localToday();

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} />
      <FlatList
        data={items ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const previous = items![index + 1];
          const change = previous ? item.weight - previous.weight : null;
          const summary = measurementSummary(item);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/measurements/edit", params: { date: item.date } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.date}>{formatDayLabel(item.date, today)}</Text>
                {summary ? <Text style={styles.muted}>{summary}</Text> : null}
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.weight}>{fmt(item.weight)} kg</Text>
                {change ? (
                  <Text style={styles.muted}>
                    {change > 0 ? "+" : ""}
                    {fmt(change)} kg
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          items === null ? (
            error ? null : <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <Text style={styles.empty}>
              Chưa có lần đo nào. Ghi cân nặng và các vòng đo để theo dõi thay đổi của cơ thể.
            </Text>
          )
        }
      />
      <View style={styles.footer}>
        <Button
          title="+ Ghi số đo"
          onPress={() => router.push({ pathname: "/measurements/edit", params: { date: today } })}
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1 },
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.6 },
  date: { fontSize: 16, fontWeight: "600", color: colors.text },
  weight: { fontSize: 16, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  muted: { fontSize: 13, color: colors.textMuted },
  alignEnd: { alignItems: "flex-end" },
  loading: { marginTop: spacing.xl },
  empty: { fontSize: 15, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl, lineHeight: 22 },
  footer: { padding: spacing.lg },
}));
