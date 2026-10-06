import { localeTag , translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError } from "@/api/client";
import { mealCopyApi } from "@/api/nutritionApi";
import { MacroBars } from "@/components/nutrition/MacroBars";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { WaterCard } from "@/components/nutrition/WaterCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { addDays, DEFAULT_MEALS, formatDayLabel, formatServing, mealLabel } from "@/lib/nutrition";
import { useNutritionStore } from "@/stores/nutritionStore";
import type { FoodLog, MealType } from "@/types/models";

const fmt = (n: number) => n.toLocaleString(localeTag(), { maximumFractionDigits: 1 });

export default function NutritionScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const { today, selectedDate, summary, logs, isLoading, error, load, reload } = useNutritionStore();
  const [copying, setCopying] = useState<MealType | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const meals = summary?.mealOptions ?? DEFAULT_MEALS;

  // Tải lại khi quay về tab (vừa thêm / sửa món ở màn khác)
  useFocusEffect(
    useCallback(() => {
      useNutritionStore.getState().reload();
    }, [])
  );

  if (!summary || !selectedDate || !today) {
    return (
      <View style={styles.center}>
        {error ? <ErrorBanner message={error} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const isToday = selectedDate === today;
  const remaining = summary.remaining;

  function openAdd(mealType: MealType) {
    router.push({ pathname: "/food/search", params: { mealType, date: selectedDate! } });
  }

  // Chép nguyên các món của cùng bữa ngày hôm trước vào ngày đang xem
  async function copyPrevious(mealType: MealType) {
    const fromDate = addDays(selectedDate!, -1);
    const ok = await confirmAction({
      title: t("Chép {value1} ngày {value2}?", { value1: mealLabel(mealType, meals).toLowerCase(), value2: formatDayLabel(fromDate, today!).toLowerCase() }),
      message: t("Các món của bữa đó sẽ được thêm vào bữa này."),
      confirmText: t("Chép"),
    });
    if (!ok) return;
    setCopying(mealType);
    setNotice(null);
    try {
      const res = await mealCopyApi.copy({ fromDate, fromMealType: mealType, toDate: selectedDate! });
      await reload();
      setNotice(t("Đã chép {value1} món vào {value2}.", { value1: res.items.length, value2: mealLabel(mealType, meals).toLowerCase() }));
    } catch (err) {
      setNotice(
        err instanceof ApiError && err.status === 404
          ? t("{value1} ngày {value2} chưa có món nào.", { value1: mealLabel(mealType, meals), value2: formatDayLabel(fromDate, today!).toLowerCase() })
          : errorMessage(err)
      );
    } finally {
      setCopying(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => load(selectedDate)} />
      }
    >
      <View style={styles.dateBar}>
        <Pressable
          accessibilityLabel={t("Ngày trước")}
          hitSlop={12}
          onPress={() => load(addDays(selectedDate, -1))}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.dateText}>{formatDayLabel(selectedDate, today)}</Text>
        <Pressable
          accessibilityLabel={t("Ngày sau")}
          hitSlop={12}
          disabled={isToday}
          onPress={() => load(addDays(selectedDate, 1))}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? colors.border : colors.primary}
          />
        </Pressable>
      </View>

      <ErrorBanner message={error} />
      <Button title={t("Lịch sử theo ngày")} variant="secondary" onPress={() => router.push("/history")} />

      <Card>
        {summary.target ? (
          <>
            <View style={styles.remainingRow}>
              <View>
                <Text style={styles.bigNumber}>{fmt(Math.abs(remaining!.calories))}</Text>
                <Text style={styles.muted}>
                  {remaining!.calories >= 0 ? t("kcal còn lại") : t("kcal vượt mục tiêu")}
                </Text>
              </View>
              <View style={styles.alignEnd}>
                <Text style={styles.mediumNumber}>{fmt(summary.consumed.calories)}</Text>
                <Text style={styles.muted}>/ {fmt(summary.target.calories)} kcal</Text>
              </View>
            </View>
            <MacroBars consumed={summary.consumed} target={summary.target} />
            {isToday ? (
              <Button
                title={t("✨ Gợi ý món cho phần còn lại")}
                variant="secondary"
                onPress={() => router.push("/ai/meal")}
              />
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.bigNumber}>{fmt(summary.consumed.calories)} kcal</Text>
            <MacroChips values={summary.consumed} />
            <Text style={styles.muted}>
              {isToday
                ? t("Chưa có mục tiêu dinh dưỡng. Thiết lập ở Hồ sơ để theo dõi phần còn lại.")
                : t("Ngày này chưa có mục tiêu dinh dưỡng.")}
            </Text>
            {isToday ? (
              <Link href="/profile" asChild>
                <Button title={t("Thiết lập mục tiêu")} onPress={() => {}} variant="secondary" />
              </Link>
            ) : null}
          </>
        )}
      </Card>

      <WaterCard date={selectedDate} />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {meals.map((meal) => (
        <MealSection
          key={meal.id}
          mealName={meal.name}
          calories={summary.meals[meal.id]?.calories ?? 0}
          logs={logs.filter((l) => l.mealType === meal.id)}
          onAdd={() => openAdd(meal.id)}
          onTemplates={() =>
            router.push({ pathname: "/food/templates", params: { mealType: meal.id, date: selectedDate } })
          }
          onCopyPrevious={() => copyPrevious(meal.id)}
          copying={copying === meal.id}
        />
      ))}
    </ScrollView>
  );
}

function MealSection({
  mealName,
  calories,
  logs,
  onAdd,
  onTemplates,
  onCopyPrevious,
  copying,
}: {
  mealName: string;
  calories: number;
  logs: FoodLog[];
  onAdd: () => void;
  onTemplates: () => void;
  onCopyPrevious: () => void;
  copying: boolean;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Card>
      <View style={styles.mealHeader}>
        <Text style={styles.mealTitle}>{mealName}</Text>
        <Text style={styles.muted}>{fmt(calories)} kcal</Text>
      </View>

      {logs.map((log) => (
        <Pressable
          key={log.id}
          accessibilityRole="button"
          accessibilityLabel={`${log.foodName}, ${formatServing(log.quantity, log.servingUnit)}`}
          onPress={() => router.push({ pathname: "/food/detail", params: { logId: log.id } })}
          style={({ pressed }) => [styles.logRow, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text style={styles.logName} numberOfLines={1}>
              {log.foodName}
            </Text>
            <Text style={styles.muted}>{formatServing(log.quantity, log.servingUnit)}</Text>
          </View>
          <Text style={styles.logCalories}>{fmt(log.calories)} kcal</Text>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Thêm món vào {value1}", { value1: mealName })}
        onPress={onAdd}
        style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.addText}>{t("Thêm món")}</Text>
      </Pressable>

      <View style={styles.extraRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Bữa mẫu cho {value1}", { value1: mealName })}
          onPress={onTemplates}
          hitSlop={6}
          style={({ pressed }) => [styles.extraButton, pressed && styles.pressed]}
        >
          <Ionicons name="bookmark-outline" size={16} color={colors.textMuted} />
          <Text style={styles.extraText}>{t("Bữa mẫu")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Chép {value1} ngày trước", { value1: mealName })}
          onPress={onCopyPrevious}
          disabled={copying}
          hitSlop={6}
          style={({ pressed }) => [styles.extraButton, (pressed || copying) && styles.pressed]}
        >
          <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
          <Text style={styles.extraText}>{copying ? t("Đang chép…") : t("Chép ngày trước")}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = themedStyles(() => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg },
  flex: { flex: 1 },
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  dateText: { fontSize: 17, fontWeight: "600", color: colors.text },
  remainingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  alignEnd: { alignItems: "flex-end" },
  bigNumber: { fontSize: 32, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  mediumNumber: { fontSize: 18, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  muted: { fontSize: 14, color: colors.textMuted },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  logName: { fontSize: 15, fontWeight: "500", color: colors.text },
  logCalories: { fontSize: 15, color: colors.text, fontVariant: ["tabular-nums"] },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  addText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  pressed: { opacity: 0.6 },
  notice: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  extraRow: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  extraButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs },
  extraText: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
}));
