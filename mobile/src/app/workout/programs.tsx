import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { programApi } from "@/api/workoutApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { dayName } from "@/lib/goal";
import { useWorkoutStore } from "@/stores/workoutStore";
import type { ProgramPreset, WeeklyProgram } from "@/types/models";

export default function ProgramsScreen() {
  const [programs, setPrograms] = useState<WeeklyProgram[]>([]);
  const [presets, setPresets] = useState<ProgramPreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, presetList] = await Promise.all([programApi.list(), programApi.presets()]);
      setPrograms(list.items);
      setPresets(presetList);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleFavorite(program: WeeklyProgram) {
    try {
      await programApi.setFavorite(program.id, !program.isFavorite);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function applyPreset(preset: ProgramPreset) {
    const ok = await confirmAction({
      title: `Dùng lịch "${preset.name}"?`,
      message: "FitTrack sẽ tạo sẵn các template cho từng buổi. Bạn có thể sửa số set, bài tập sau.",
      confirmText: "Tạo lịch",
    });
    if (!ok) return;

    setApplying(preset.key);
    setNotice(null);
    try {
      await programApi.applyPreset(preset.key);
      await Promise.all([load(), useWorkoutStore.getState().loadTemplates()]);
      setNotice(`Đã tạo lịch "${preset.name}". Bấm ☆ để đưa lịch lên tab Tập luyện.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setApplying(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Card title="Lịch tuần của bạn">
        {programs.length === 0 ? (
          <Text style={styles.muted}>
            Chưa có lịch nào. Chọn một lịch đề xuất bên dưới hoặc tự xếp template vào từng ngày.
          </Text>
        ) : null}
        {programs.map((program) => (
          <Pressable
            key={program.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/workout/program", params: { id: program.id } })}
            style={({ pressed }) => [styles.program, pressed && styles.pressed]}
          >
            <View style={styles.programHeader}>
              <Text style={styles.name}>{program.name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={program.isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                hitSlop={10}
                onPress={() => toggleFavorite(program)}
              >
                <Ionicons
                  name={program.isFavorite ? "star" : "star-outline"}
                  size={22}
                  color={program.isFavorite ? colors.primary : colors.textMuted}
                />
              </Pressable>
            </View>
            {program.days.map((d) => (
              <Text key={d.dayOfWeek} style={styles.muted}>
                {dayName(d.dayOfWeek)} · {d.templateName ?? "Template đã xoá"}
              </Text>
            ))}
          </Pressable>
        ))}
        <Button
          title="Tự tạo lịch tuần"
          variant="secondary"
          onPress={() => router.push("/workout/program")}
        />
      </Card>

      <Text style={styles.section}>Lịch đề xuất</Text>
      {presets.map((preset) => (
        <Card key={preset.key} title={preset.name}>
          <Text style={styles.muted}>{preset.description}</Text>
          {preset.days.map((d) => (
            <View key={d.dayOfWeek} style={styles.presetDay}>
              <Text style={styles.dayLabel}>
                {dayName(d.dayOfWeek)} · {d.name}
              </Text>
              <Text style={styles.exercises}>
                {d.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(", ")}
              </Text>
            </View>
          ))}
          <Button
            title="Dùng lịch này"
            loading={applying === preset.key}
            disabled={applying !== null}
            onPress={() => applyPreset(preset)}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  content: { padding: spacing.lg, gap: spacing.lg },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  notice: { fontSize: 14, color: colors.success },
  section: { fontSize: 18, fontWeight: "700", color: colors.text },
  program: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  programHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  pressed: { opacity: 0.6 },
  presetDay: { gap: 2 },
  dayLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  exercises: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
}));
