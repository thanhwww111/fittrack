import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { programApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { dayName } from "@/lib/goal";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { WeeklyProgram } from "@/types/models";

const REST = "rest";
const WEEK = [1, 2, 3, 4, 5, 6, 7];

type Schedule = Record<number, string>; // dayOfWeek → templateId hoặc REST

function scheduleOf(program: WeeklyProgram | null): Schedule {
  const schedule: Schedule = Object.fromEntries(WEEK.map((d) => [d, REST]));
  for (const day of program?.days ?? []) schedule[day.dayOfWeek] = day.templateId;
  return schedule;
}

// Tạo / sửa lịch tuần: mỗi thứ chọn một template hoặc Nghỉ
export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const templates = useWorkoutStore((s) => s.templates);

  const [program, setProgram] = useState<WeeklyProgram | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<Schedule>(scheduleOf(null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    useWorkoutStore.getState().loadTemplates();
    if (!id) return;
    programApi
      .get(id)
      .then((p) => {
        setProgram(p);
        setName(p.name);
        setSchedule(scheduleOf(p));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const options: ChipOption<string>[] = [
    { value: REST, label: "Nghỉ" },
    ...templates.map((t) => ({ value: t.id, label: t.name })),
  ];

  async function handleSave() {
    const days = WEEK.filter((d) => schedule[d] !== REST).map((d) => ({
      dayOfWeek: d,
      templateId: schedule[d],
    }));
    if (!name.trim()) {
      setError("Đặt tên cho lịch tuần.");
      return;
    }
    if (days.length === 0) {
      setError("Chọn template cho ít nhất một ngày.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = { name: name.trim(), days };
      if (program) await programApi.update(program.id, input);
      else await programApi.create(input);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: "Xoá lịch tuần này?",
      message: "Các template trong lịch vẫn được giữ lại.",
      confirmText: "Xoá",
      destructive: true,
    });
    if (!ok || !program) return;
    try {
      await programApi.remove(program.id);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: program ? "Sửa lịch tuần" : "Tạo lịch tuần" }} />
      <ErrorBanner message={error} />

      <TextField label="Tên lịch" value={name} onChangeText={setName} placeholder="Ví dụ: PPL của tôi" />

      {templates.length === 0 ? (
        <Card>
          <Text style={styles.muted}>
            Bạn chưa có template nào. Tạo template cho từng buổi trước, hoặc quay lại chọn một lịch
            đề xuất.
          </Text>
          <Button
            title="Tạo template"
            variant="secondary"
            onPress={() => router.push("/workout/template")}
          />
        </Card>
      ) : (
        <Card>
          {WEEK.map((d) => (
            <ChipGroup
              key={d}
              label={dayName(d)}
              options={options}
              value={schedule[d]}
              onChange={(value) => setSchedule((prev) => ({ ...prev, [d]: value }))}
            />
          ))}
        </Card>
      )}

      <Button title="Lưu lịch tuần" onPress={handleSave} loading={saving} />
      {program ? <Button title="Xoá lịch" variant="danger" onPress={handleDelete} /> : null}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.lg },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
}));
