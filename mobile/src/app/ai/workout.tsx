import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { aiApi } from "@/api/aiApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, spacing } from "@/constants/theme";
import { aiErrorMessage } from "@/lib/aiErrors";
import { formatVolume } from "@/lib/workout";
import { shortDate } from "@/components/charts/scale";
import type { WorkoutAnalysis } from "@/types/models";

export default function AiWorkoutScreen() {
  const [analysis, setAnalysis] = useState<WorkoutAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      setAnalysis(await aiApi.analyzeWorkouts());
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.muted}>
          AI đọc các buổi tập đã hoàn thành trong 4 tuần gần nhất (set tốt nhất mỗi bài, volume mỗi
          tuần) và đưa ra nhận xét cùng gợi ý cho tuần tới. Cần ít nhất 2 buổi tập.
        </Text>
        <Button
          title={analysis ? "Phân tích lại" : "✨ Phân tích 4 tuần"}
          onPress={handleAnalyze}
          loading={loading}
        />
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>AI đang xem lại các buổi tập của bạn…</Text>
        </View>
      ) : null}

      {analysis && !loading ? (
        <>
          <Card title="Tổng quan">
            <Text style={styles.body}>{analysis.summary}</Text>
            <View style={styles.weeks}>
              {analysis.weeks.map((w) => (
                <View key={w.weekStart} style={styles.week}>
                  <Text style={styles.weekLabel}>Tuần {shortDate(w.weekStart)}</Text>
                  <Text style={styles.weekValue}>{w.sessions} buổi</Text>
                  <Text style={styles.weekLabel}>{formatVolume(w.volume)}</Text>
                </View>
              ))}
            </View>
          </Card>

          {analysis.highlights.length > 0 ? (
            <Card title="Điểm nổi bật">
              {analysis.highlights.map((h, i) => (
                <Text key={i} style={styles.body}>
                  🏅 {h}
                </Text>
              ))}
            </Card>
          ) : null}

          {analysis.suggestions.length > 0 ? (
            <Card title="Gợi ý cho tuần tới">
              {analysis.suggestions.map((s, i) => (
                <Text key={i} style={styles.body}>
                  → {s}
                </Text>
              ))}
            </Card>
          ) : null}

          <Text style={styles.disclaimer}>
            Nhận xét do AI tạo từ số liệu của bạn, chỉ mang tính tham khảo.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  loading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  weeks: { flexDirection: "row", gap: spacing.sm },
  week: { flex: 1, gap: 2 },
  weekLabel: { fontSize: 12, color: colors.textMuted },
  weekValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  disclaimer: { fontSize: 12, color: colors.textMuted },
});
