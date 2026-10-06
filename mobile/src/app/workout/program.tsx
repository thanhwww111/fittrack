import { translate as t, useTranslation } from "@/i18n";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { programApi, templateApi } from "@/api/workoutApi";
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
import { useTrainingScheduleStore } from "@/stores/trainingScheduleStore";
import { scheduleRequestId } from "@/lib/trainingSchedule";
import { useProfileStore } from "@/stores/profileStore";
import { useDraftState, getFormDraft, clearFormDrafts } from "@/hooks/useDraftState";

const REST = "rest";
const WEEK = [1, 2, 3, 4, 5, 6, 7];
const SUGGESTIONS = [
  { key: "push", get name() { return t("Ngực vai tay sau"); } },
  { key: "pull", get name() { return t("Lưng xô tay trước"); } },
  { key: "legs", get name() { return t("Chân bụng"); } },
  { key: "upper", get name() { return t("Upper (thân trên)"); } },
  { key: "lower", get name() { return t("Lower (thân dưới)"); } },
];
const SUGGESTION_PREFIX = "suggestion:";

type Schedule = Record<number, string>; // dayOfWeek → templateId hoặc REST

function scheduleOf(program: WeeklyProgram | null): Schedule {
  const schedule: Schedule = Object.fromEntries(WEEK.map((d) => [d, REST]));
  for (const day of program?.days ?? []) schedule[day.dayOfWeek] = day.templateId;
  return schedule;
}

// Tạo / sửa lịch tuần: mỗi thứ chọn một template hoặc Nghỉ
export default function ProgramScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const { id, setup } = useLocalSearchParams<{ id?: string; setup?: string }>();
  const applyRequest = useRef(scheduleRequestId());
  const savedProgram = useRef<WeeklyProgram | null>(null);
  const templates = useWorkoutStore((s) => s.templates);

  const [program, setProgram] = useState<WeeklyProgram | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const draftKey = `program-${id ?? "new"}-`;
  const [name, setName] = useDraftState(draftKey + "name", "");
  const [schedule, setSchedule] = useDraftState<Schedule>(draftKey + "schedule", scheduleOf(null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const resolvedSuggestions = useRef(new Map<string, string>());

  // Quay lại sau khi thêm buổi tập: làm mới lựa chọn, giữ nguyên lịch đang soạn.
  useFocusEffect(useCallback(() => {
    useWorkoutStore.getState().loadTemplates();
  }, []));

  useEffect(() => {
    if (!id) return;
    programApi
      .get(id)
      .then((p) => {
        setProgram(p);
        setName(getFormDraft(draftKey + "name", p.name));
        setSchedule(getFormDraft(draftKey + "schedule", scheduleOf(p)));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, draftKey, setName, setSchedule]);

  const options: ChipOption<string>[] = [
    { value: REST, label: t("Nghỉ") },
    ...SUGGESTIONS.map((suggestion) => {
      const saved = templates.find((template) => template.suggestedKey === suggestion.key);
      return {
        value: `${SUGGESTION_PREFIX}${suggestion.key}`,
        label: saved?.name ?? suggestion.name,
      };
    }),
    ...templates.filter((item) => !item.suggestedKey).map((item) => ({
      value: item.id,
      label: SUGGESTIONS.some((s) => s.name === item.name) ? t("{value1} (đã lưu)", { value1: item.name }) : item.name,
    })),
  ];

  function optionValue(templateId: string) {
    const key = templates.find((template) => template.id === templateId)?.suggestedKey;
    return key ? `${SUGGESTION_PREFIX}${key}` : templateId;
  }

  async function handleSave() {
    if (saveInFlight.current) return;
    const days = WEEK.filter((d) => schedule[d] !== REST).map((d) => ({
      dayOfWeek: d,
      templateId: schedule[d],
    }));
    if (!name.trim()) {
      setError(t("Đặt tên cho lịch tuần."));
      return;
    }
    if (days.length === 0) {
      setError(t("Chọn template cho ít nhất một ngày."));
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      // Mỗi gợi ý chỉ tạo một mẫu dù được chọn cho nhiều ngày; giữ ID để thử lưu lại.
      for (const selected of new Set(days.map((day) => day.templateId))) {
        if (!selected.startsWith(SUGGESTION_PREFIX)) continue;
        if (!resolvedSuggestions.current.has(selected)) {
          const key = selected.slice(SUGGESTION_PREFIX.length);
          const template = templates.find((item) => item.suggestedKey === key)
            ?? await templateApi.applySuggestion(key);
          resolvedSuggestions.current.set(selected, template.id);
        }
      }
      for (const day of days) {
        day.templateId = resolvedSuggestions.current.get(day.templateId) ?? day.templateId;
      }
      const input = { name: name.trim(), days };
      const existing = program ?? savedProgram.current;
      savedProgram.current = existing ? await programApi.update(existing.id, input) : await programApi.create(input);
      if (setup === "1") {
        await useTrainingScheduleStore.getState().apply(savedProgram.current.id, applyRequest.current);
        useProfileStore.getState().setOnboardingActive(false);
      }
      await useWorkoutStore.getState().loadTemplates();
      clearFormDrafts(draftKey);
      if (setup === "1") router.replace("/(tabs)/workout");
      else router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
      saveInFlight.current = false;
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: t("Xoá lịch tuần này?"),
      message: t("Các template trong lịch vẫn được giữ lại."),
      confirmText: t("Xoá"),
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
      <Stack.Screen options={{ title: program ? t("Sửa lịch tuần") : t("Tạo lịch tuần") }} />
      <ErrorBanner message={error} />

      <TextField label={t("Tên lịch")} value={name} onChangeText={setName} placeholder={t("Ví dụ: PPL của tôi")} />

      <Card title={t("Các buổi tập để xếp lịch")}>
        <Button title={t("Chỉnh bài, set và rep của các buổi")} variant="secondary" onPress={() => router.push("/workout/templates")} />
        <Text style={styles.muted}>{t("Sau khi sửa, quay lại thư viện lịch và bấm Áp dụng để cập nhật từ ngày mai. Buổi hôm nay và lịch sử được giữ nguyên.")}</Text>
        <Text style={styles.muted}>{t("Chọn buổi gợi ý có sẵn bài tập hoặc buổi bạn đã lưu cho từng ngày. Bấm “+ Thêm buổi tập” để tự tạo buổi khác.")}</Text>
        <Button
          title={t("+ Thêm buổi tập")}
          variant="secondary"
          disabled={saving}
          onPress={() => router.push("/workout/template")}
        />
      </Card>

      <Card>
          {WEEK.map((d) => (
            <ChipGroup
              key={d}
              label={dayName(d)}
              options={options}
              value={optionValue(schedule[d])}
              onChange={(value) => {
                if (!saveInFlight.current) setSchedule((prev) => ({ ...prev, [d]: value }));
              }}
            />
          ))}
      </Card>

      <Button title={t("Lưu lịch tuần")} onPress={handleSave} loading={saving} />
      {program ? <Button title={t("Xoá lịch")} variant="danger" onPress={handleDelete} /> : null}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.lg },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
}));
