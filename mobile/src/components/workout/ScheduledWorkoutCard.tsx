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

export function ScheduledWorkoutCard() {
  const { data, error, loading, load } = useTrainingScheduleStore();
  const active = useWorkoutStore(s => s.activeSession);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    void load(); void useWorkoutStore.getState().loadActive();
  }, [load]));
  const day = data?.days.find(d => d.date === data.today);
  const missed = data?.days.filter(d => d.date < data.today && d.status === "MISSED").at(-1);
  const next = data?.days.find(d => d.date > data.today && d.workout);
  async function start() {
    if (busy) return;
    setBusy(true); setStartError(null);
    try {
      const session = await trainingScheduleApi.start();
      if (session.status === "COMPLETED") {
        router.push({ pathname: "/workout/session", params: { id: session.id } }); return;
      }
      if (session.status !== "IN_PROGRESS") throw new Error("Buổi này đã kết thúc. Lịch ngày mai giữ nguyên.");
      useWorkoutStore.setState({ activeSession: session, pendingExercises: [], prAlert: null });
      await load();
      router.push("/workout/start");
    } catch (e) { setStartError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <Card title="Lịch tập hôm nay" icon="calendar">
    <ErrorBanner message={error ?? startError} />
    {loading && !data ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <Button title="Tải lại lịch" onPress={load} /> : null}
    {day ? <>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>{day.workout?.templateName ?? trainingStatusLabel[day.status]}</Text>
      <Text style={{ color: colors.textMuted }}>{data?.current?.name} · {day.date} · {trainingStatusLabel[day.status]}</Text>
      {day.workout ? <Text style={{ color: colors.textMuted }}>{day.workout.exerciseCount} bài tập</Text> : null}
      {day.status === "REST" ? <Text style={{ color: colors.textMuted }}>Hôm nay nghỉ. {next ? `Buổi tiếp theo: ${next.workout?.templateName}, ngày ${next.date}.` : ""}</Text> : null}
      {day.status === "PLANNED" && !active ? <Button title="Bắt đầu buổi hôm nay" loading={busy} onPress={start} /> : null}
      {day.status === "COMPLETED" && day.sessionId ? <Button title="Xem buổi đã hoàn thành" variant="secondary" onPress={() => router.push({ pathname: "/workout/session", params: { id: day.sessionId! } })} /> : null}
      {day.status === "NO_PLAN" ? <Button title="Chọn lịch tuần" onPress={() => router.push("/workout/programs")} /> : null}
    </> : null}
    {active ? <><Text style={{ color: colors.text }}>Đang tập: {active.name}</Text><Button title="Tiếp tục buổi tập" onPress={() => router.push("/workout/start")} /></> : null}
    {missed ? <Text style={{ color: colors.textMuted }}>Ngày {missed.date} bạn đã bỏ lỡ {missed.workout?.templateName}. Lịch hôm nay không thay đổi.</Text> : null}
    {data?.pending ? <Text style={{ color: colors.textMuted }}>Lịch {data.pending.name} sẽ áp dụng từ {data.pending.effectiveFrom}.</Text> : null}
  </Card>;
}
