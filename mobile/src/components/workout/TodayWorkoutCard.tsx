import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, spacing, themedStyles } from "@/constants/theme";
import { formatDuration, formatVolume } from "@/lib/workout";
import type { WorkoutSession } from "@/types/models";

interface TodayWorkoutCardProps {
  active: WorkoutSession | null;
  completed: WorkoutSession[];
}

function countSets(session: WorkoutSession) {
  return session.exercises.reduce((n, e) => n + e.sets.length, 0);
}

// Thẻ "Buổi tập hôm nay" trên Home: đang tập → Tiếp tục, đã tập → tóm tắt, chưa tập → Bắt đầu
export function TodayWorkoutCard({ active, completed }: TodayWorkoutCardProps) {
  if (active) {
    return (
      <Card title="Buổi tập hôm nay" style={styles.activeCard}>
        <Text style={styles.name}>{active.name}</Text>
        <Text style={styles.muted}>
          {active.exercises.length} bài · {countSets(active)} set · {formatVolume(active.totalVolume)}
        </Text>
        <Button title="Tiếp tục buổi tập" onPress={() => router.push("/workout/start")} />
      </Card>
    );
  }

  if (completed.length > 0) {
    return (
      <Card title="Buổi tập hôm nay">
        {completed.map((s) => (
          <View key={s.id} style={styles.row}>
            <Text style={styles.check}>✓</Text>
            <View style={styles.flex}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.muted}>
                {s.exercises.length} bài · {countSets(s)} set · {formatVolume(s.totalVolume)} ·{" "}
                {formatDuration(s.duration)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  }

  return (
    <Card title="Buổi tập hôm nay">
      <Text style={styles.muted}>Hôm nay bạn chưa tập.</Text>
      <Button title="Bắt đầu tập" variant="secondary" onPress={() => router.push("/workout")} />
    </Card>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  activeCard: { borderColor: colors.primary, borderWidth: 2 },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  check: { fontSize: 18, fontWeight: "700", color: colors.success },
}));
