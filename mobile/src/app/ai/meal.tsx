import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { aiApi } from "@/api/aiApi";
import { foodApi } from "@/api/foodApi";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChipGroup, type ChipOption } from "@/components/ui/ChipGroup";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { aiErrorMessage } from "@/lib/aiErrors";
import { confirmAction } from "@/lib/confirm";
import { errorMessage } from "@/lib/formErrors";
import { useNutritionStore } from "@/stores/nutritionStore";
import { MEAL_LABELS, MEAL_ORDER, mealTypeForHour } from "@/lib/nutrition";
import type { MealSuggestion, MealSuggestionResult, MealType } from "@/types/models";

const MEAL_OPTIONS: ChipOption<MealType>[] = MEAL_ORDER.map((m) => ({ value: m, label: MEAL_LABELS[m] }));
const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString("vi-VN");

export default function AiMealScreen() {
  const params = useLocalSearchParams<{ mealType?: string }>();
  const [mealType, setMealType] = useState<MealType>(
    MEAL_ORDER.includes(params.mealType as MealType)
      ? (params.mealType as MealType)
      : mealTypeForHour(new Date().getHours())
  );
  const [preferences, setPreferences] = useState("");
  const [result, setResult] = useState<MealSuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState<number | null>(null);
  const addLog = useNutritionStore((s) => s.addLog);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await aiApi.suggestMeals({ mealType, preferences: preferences.trim() || undefined })
      );
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Lưu gợi ý thành món tự tạo "1 phần" với macro AI ước tính, rồi ghi vào bữa đang chọn
  async function logSuggestion(suggestion: MealSuggestion, index: number) {
    const ok = await confirmAction({
      title: `Ghi "${suggestion.name}" vào ${MEAL_LABELS[mealType].toLowerCase()}?`,
      message:
        "Món sẽ được lưu vào danh sách món của bạn (1 phần) với số liệu AI ước tính. Bạn có thể sửa lại sau.",
      confirmText: "Ghi vào nhật ký",
    });
    if (!ok) return;

    setLogging(index);
    setError(null);
    try {
      const food = await foodApi.create({
        name: suggestion.name.slice(0, 100),
        servingSize: 1,
        servingUnit: "piece",
        calories: Math.max(0, Math.round(suggestion.calories)),
        protein: Math.max(0, Math.round(suggestion.protein)),
        carbs: Math.max(0, Math.round(suggestion.carbs)),
        fat: Math.max(0, Math.round(suggestion.fat)),
        fiber: 0,
      });
      await addLog({ foodId: food.id, mealType, quantity: 1, date: result?.date });
      router.dismissTo("/nutrition");
    } catch (err) {
      setError(errorMessage(err));
      setLogging(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <ChipGroup label="Gợi ý cho" options={MEAL_OPTIONS} value={mealType} onChange={setMealType} />
          <TextField
            label="Sở thích (không bắt buộc)"
            value={preferences}
            onChangeText={setPreferences}
            placeholder="Ví dụ: không ăn cay, trong tủ có trứng và ức gà"
            maxLength={200}
          />
          <Button
            title={result ? "Gợi ý lại" : "✨ Gợi ý món"}
            onPress={handleSuggest}
            loading={loading}
          />
        </Card>

        <ErrorBanner message={error} />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>AI đang tính toán theo phần calo còn lại của bạn…</Text>
          </View>
        ) : null}

        {result && !loading ? (
          <>
            <Text style={styles.remaining}>
              Còn lại hôm nay: {fmt(result.remaining.calories)} kcal · protein{" "}
              {fmt(result.remaining.protein)} g
            </Text>
            {result.suggestions.map((s, i) => (
              <SuggestionCard
                key={`${s.name}-${i}`}
                suggestion={s}
                logging={logging === i}
                disabled={logging !== null}
                onLog={() => logSuggestion(s, i)}
              />
            ))}
            <Text style={styles.disclaimer}>
              Calo và macro do AI ước tính, có thể sai lệch. Khi ghi vào nhật ký, hãy chọn món và
              khối lượng thực tế để số liệu chính xác.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SuggestionCard({
  suggestion,
  onLog,
  logging,
  disabled,
}: {
  suggestion: MealSuggestion;
  onLog: () => void;
  logging: boolean;
  disabled: boolean;
}) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{suggestion.name}</Text>
        <Text style={[styles.badge, suggestion.fitsRemaining ? styles.badgeOk : styles.badgeOver]}>
          {suggestion.fitsRemaining ? "Vừa phần còn lại" : "Vượt calo còn lại"}
        </Text>
      </View>
      {suggestion.description ? <Text style={styles.muted}>{suggestion.description}</Text> : null}
      <MacroChips values={suggestion} />
      <View style={styles.ingredients}>
        {suggestion.ingredients.map((item, i) => (
          <Text key={i} style={styles.ingredient}>
            • {item.name}: <Text style={styles.amount}>{item.amount}</Text>
          </Text>
        ))}
      </View>
      <Button
        title="Ghi vào nhật ký"
        variant="secondary"
        onPress={onLog}
        loading={logging}
        disabled={disabled}
      />
    </Card>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  loading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  remaining: { fontSize: 14, fontWeight: "600", color: colors.text },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  badgeOk: { color: colors.success, backgroundColor: colors.successSoft },
  badgeOver: { color: colors.danger, backgroundColor: colors.dangerSoft },
  ingredients: { gap: 2 },
  ingredient: { fontSize: 14, color: colors.text },
  amount: { color: colors.textMuted },
  disclaimer: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
}));
