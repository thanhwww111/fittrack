import { translate as t, useTranslation } from "@/i18n";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { trainingScheduleApi } from "@/api/trainingScheduleApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors } from "@/constants/theme";
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { errorMessage } from "@/lib/formErrors";
import { trainingStatusLabel } from "@/lib/trainingSchedule";
import { addDays } from "@/lib/nutrition";
import { dayName } from "@/lib/goal";

export function ScheduledWorkoutCard() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const { data, error, loading, load } = useTrainingScheduleStore();
  const active = useWorkoutStore(s => s.activeSession);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    void load(); void useWorkoutStore.getState().loadActive();
  }, [load]));
  const today = data?.days.find(d => d.date === data.today);
  const missed = data?.days.filter(d => d.date < data.today && d.status === "MISSED").at(-1);
  const next = data?.days.filter(d => d.date > data.today && d.workout && d.status === "PLANNED")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const showNext = today && ["REST", "COMPLETED", "MISSED"].includes(today.status);
  const day = showNext && next ? next : today;
  const future = !!day && !!data && day.date > data.today;
  const dateLabel = day ? `${dayName(new Date(`${day.date}T00:00:00Z`).getUTCDay() || 7)} · ${day.date}` : "";
  const title = future ? (day!.date === addDays(data!.today, 1) ? t("Lịch tập ngày mai") : t("Lịch tập {value1}", { value1: dateLabel }))
    : today?.workout && !showNext ? t("Lịch tập hôm nay") : t("Lịch tập");
  const programName = day && data?.pending && day.date >= data.pending.effectiveFrom ? data.pending.name : data?.current?.name;
  async function start() {
    if (busy || future || today?.status !== "PLANNED" || active) return;
    setBusy(true); setStartError(null);
    try {
      const session = await trainingScheduleApi.start();
      if (session.status === "COMPLETED") {
        router.push({ pathname: "/workout/session", params: { id: session.id } }); return;
      }
      if (session.status !== "IN_PROGRESS") throw new Error(t("Buổi này đã kết thúc. Lịch ngày mai giữ nguyên."));
      useWorkoutStore.setState({ activeSession: session, pendingExercises: [], prAlert: null });
      await load();
      router.push("/workout/start");
    } catch (e) { setStartError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <Card title={title} icon="calendar">
    <ErrorBanner message={error ?? startError} />
    {loading && !data ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <Button title={t("Tải lại lịch")} onPress={load} /> : null}
    {day ? <>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>{day.workout?.templateName ?? trainingStatusLabel[day.status]}</Text>
      <Text style={{ color: colors.textMuted }}>{programName} · {dateLabel} · {future ? t("Sắp tới") : trainingStatusLabel[day.status]}</Text>
      {day.workout ? <Text style={{ color: colors.textMuted }}>{t("{value1} bài tập", { value1: day.workout.exerciseCount })}</Text> : null}
      {today?.status === "REST" ? <Text style={{ color: colors.textMuted }}>{t("Hôm nay nghỉ.")}</Text> : null}
      {today?.status === "COMPLETED" ? <Text style={{ color: colors.textMuted }}>{t("Bạn đã hoàn thành buổi tập hôm nay.")}</Text> : null}
      {future ? <Text style={{ color: colors.textMuted }}>{t("Chỉ có thể bắt đầu khi đến ngày tập.")}</Text> : null}
      {!future && day.status === "PLANNED" && !active ? <Button title={t("Bắt đầu buổi hôm nay")} loading={busy} onPress={start} /> : null}
      {today?.status === "COMPLETED" && today.sessionId ? <Button title={t("Xem buổi đã hoàn thành")} variant="secondary" onPress={() => router.push({ pathname: "/workout/session", params: { id: today.sessionId! } })} /> : null}
      {day.status === "NO_PLAN" ? <Button title={t("Chọn lịch tuần")} onPress={() => router.push("/workout/programs")} /> : null}
    </> : null}
    {active ? <><Text style={{ color: colors.text }}>{t("Đang tập: {value1}", { value1: active.name })}</Text><Button title={t("Tiếp tục buổi tập")} onPress={() => router.push("/workout/start")} /></> : null}
    {missed ? <Text style={{ color: colors.textMuted }}>{t("Ngày {value1} bạn đã bỏ lỡ {value2}. Lịch hôm nay không thay đổi.", { value1: missed.date, value2: missed.workout?.templateName })}</Text> : null}
    {data?.pending ? <Text style={{ color: colors.textMuted }}>{t("Lịch {value1} sẽ áp dụng từ {value2}.", { value1: data.pending.name, value2: data.pending.effectiveFrom })}</Text> : null}
  </Card>;
}
