import { localeTag , translate as t, useTranslation } from "@/i18n";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import { progressApi } from "@/api/progressApi";
import { foodLogApi } from "@/api/nutritionApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { useMeals } from "@/hooks/useMeals";
import { errorMessage } from "@/lib/formErrors";
import { addDays, formatDayLabel, formatServing, mealLabel } from "@/lib/nutrition";
import { formatDuration, formatVolume } from "@/lib/workout";
import type { DailyHistory, FoodLog, HistoryDay } from "@/types/models";
import { trainingStatusLabel } from "@/lib/trainingSchedule";
import { subscribeProfileRefresh } from "@/stores/profileStore";

const fmt = (n: number) => n.toLocaleString(localeTag(), { maximumFractionDigits: 1 });

export default function HistoryScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [to, setTo] = useState<string>();
  const [data, setData] = useState<DailyHistory | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);

  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await progressApi.history(to ? { to } : {});
      if (version !== request.current) return;
      setData(result);
      setRevision((value) => value + 1);
    } catch (err) {
      if (version === request.current) setError(errorMessage(err));
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [to]);

  useFocusEffect(useCallback(() => {
    void load();
    const unsubscribe = subscribeProfileRefresh(() => { void load(); });
    return () => { unsubscribe(); request.current += 1; };
  }, [load]));

  function changePage(nextTo?: string) {
    setSelected(null);
    setData(null);
    setTo(nextTo);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={styles.muted}>{t("Ăn uống và tập luyện theo từng ngày. Bấm một ngày để xem chi tiết.")}</Text>
      <ErrorBanner message={error} />
      {error ? <Button title={t("Thử lại")} variant="secondary" onPress={load} /> : null}
      {!data && loading ? <ActivityIndicator color={colors.primary} /> : null}
      {data ? <>
        <View style={styles.navigation}>
          <Button title={t("7 ngày trước")} variant="secondary" disabled={loading}
            onPress={() => changePage(addDays(data.from, -1))} />
          <Button title={t("7 ngày sau")} variant="secondary" disabled={loading || data.to >= data.today}
            onPress={() => { const next = addDays(data.to, 7); changePage(next >= data.today ? undefined : next); }} />
        </View>
        <Text style={styles.muted}>{data.from} — {data.to}</Text>
        {to ? <Button title={t("Về hôm nay")} variant="secondary" onPress={() => changePage()} /> : null}
        {data.days.map((day) => (
          <Card key={day.date}>
            <Pressable accessibilityRole="button"
              accessibilityLabel={t("Xem ngày {value1}. {value2}. {value3} buổi tập, {value4}, {value5}.", { value1: day.date, value2: day.logged ? `${fmt(day.consumed.calories)} kcal, ${fmt(day.consumed.protein)} g protein` : t("Chưa ghi nhận ăn uống"), value3: day.workout.sessions, value4: formatVolume(day.workout.totalVolume), value5: formatDuration(day.workout.duration) })}
              accessibilityState={{ expanded: selected === day.date }}
              onPress={() => setSelected(selected === day.date ? null : day.date)} style={styles.day}>
              <Text style={styles.title}>{formatDayLabel(day.date, data.today)} · {day.date}</Text>
              {day.trainingSchedule ? <Text style={styles.value}>{trainingStatusLabel[day.trainingSchedule.status]}{day.trainingSchedule.workout ? ` · ${day.trainingSchedule.workout.templateName}` : ""}</Text> : null}
              {!day.logged && day.workout.sessions === 0 ?
                <Text style={styles.muted}>{t("Chưa ghi nhận ăn uống hoặc tập luyện.")}</Text> : <>
                  <Text style={styles.value}>{day.logged ? `${fmt(day.consumed.calories)} kcal · ${fmt(day.consumed.protein)} g protein` : t("Chưa ghi nhận ăn uống")}</Text>
                  <Text style={styles.muted}>{t("{value1} buổi tập · {value2} · {value3}", { value1: day.workout.sessions, value2: formatVolume(day.workout.totalVolume), value3: formatDuration(day.workout.duration) })}</Text>
                </>}
              <Text style={styles.link}>{selected === day.date ? t("Thu gọn") : t("Xem chi tiết")}</Text>
            </Pressable>
            {selected === day.date ? <DayDetails key={`${day.date}-${revision}`} day={day} /> : null}
          </Card>
        ))}
        <Text style={styles.muted}>{t("Khối lượng tập = tổng kg × số lần của các set đã hoàn thành, trong các buổi đã kết thúc.")}</Text>
      </> : null}
    </ScrollView>
  );
}

function DayDetails({ day }: { day: HistoryDay }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const { meals } = useMeals();
  const [logs, setLogs] = useState<FoodLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    foodLogApi.list(day.date).then((result) => { if (active) setLogs(result.items); })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [day.date, retry]);

  return (
    <View style={styles.day}>
      <Text style={styles.title}>{t("Dinh dưỡng")}</Text>
      <MacroChips values={day.consumed} />
      <Text style={styles.muted}>{day.target ? t("Mục tiêu ngày này: {value1} kcal · {value2} g protein", { value1: fmt(day.target.calories), value2: fmt(day.target.protein) }) : t("Ngày này chưa có mục tiêu dinh dưỡng.")}</Text>
      <ErrorBanner message={error} />
      {error ? <Button title={t("Tải lại món ăn")} variant="secondary" onPress={() => { setError(null); setRetry(retry + 1); }} /> : !logs ? <ActivityIndicator color={colors.primary} /> : null}
      {logs?.length === 0 ? <Text style={styles.muted}>{t("Chưa ghi nhận món ăn.")}</Text> : null}
      {[...new Set(logs?.map((log) => log.mealType))].map((mealType) => (
        <View key={mealType} style={styles.day}>
          <Text style={styles.value}>{mealLabel(mealType, meals)}</Text>
          {logs?.filter((log) => log.mealType === mealType).map((log) => (
            <Text key={log.id} style={styles.muted}>{log.foodName} · {formatServing(log.quantity, log.servingUnit)} · {fmt(log.calories)} kcal</Text>
          ))}
        </View>
      ))}
      <Text style={styles.title}>{t("Tập luyện · {value1} set", { value1: day.workout.sets })}</Text>
      {day.trainingSchedule?.sessionId && day.trainingSchedule.status !== "COMPLETED" ?
        <Button title={t("Xem buổi chưa hoàn thành")} variant="secondary"
          onPress={() => router.push({ pathname: "/workout/session", params: { id: day.trainingSchedule!.sessionId! } })} /> : null}
      {day.workouts.length === 0 ? <Text style={styles.muted}>{t("Chưa ghi nhận buổi tập hoàn thành.")}</Text> : null}
      {day.workouts.map((workout) => (
        <Pressable key={workout.id} accessibilityRole="button" accessibilityLabel={t("Xem buổi tập {value1}, {value2}, {value3}", { value1: workout.name, value2: formatVolume(workout.totalVolume), value3: formatDuration(workout.duration) })}
          onPress={() => router.push({ pathname: "/workout/session", params: { id: workout.id } })} style={styles.day}>
          <Text style={styles.link}>{workout.name}</Text>
          <Text style={styles.muted}>{formatVolume(workout.totalVolume)} · {formatDuration(workout.duration)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
  content: { padding: spacing.lg, gap: spacing.md },
  navigation: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  day: { gap: spacing.sm },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  value: { fontSize: 15, fontWeight: "600", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  link: { fontSize: 15, fontWeight: "600", color: colors.primary },
}));
