import { localeTag , translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { waterApi } from "@/api/nutritionApi";
import { Card } from "@/components/ui/Card";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";
import type { WaterDay } from "@/types/models";

const STEPS = [250, 500];

const liters = (ml: number) =>
  (ml / 1000).toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 2 });

// Theo dõi nước uống của ngày đang xem. Bấm +250 / +500 ml, "−" để bớt khi bấm nhầm.
// onChange: báo số nước mới cho màn cha (ô thống kê trang chủ) mỗi lần tải / cập nhật
export function WaterCard({ date, onChange }: { date: string; onChange?: (water: WaterDay) => void }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [water, setWaterState] = useState<WaterDay | null>(null);
  // onChange nên ổn định (setter của useState) để không tải lại nước mỗi lần render
  const setWater = useCallback(
    (w: WaterDay) => {
      setWaterState(w);
      onChange?.(w);
    },
    [onChange]
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      waterApi
        .get(date)
        .then((w) => {
          if (!cancelled) {
            setWater(w);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(errorMessage(err));
        });
      return () => {
        cancelled = true;
      };
    }, [date, setWater])
  );

  async function add(amount: number) {
    setBusy(true);
    try {
      setWater(await waterApi.add(amount, date));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const ratio = water ? Math.min(1, water.amount / water.target) : 0;
  const reached = water ? water.amount >= water.target : false;

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="water" size={20} color={colors.water} />
        <Text style={styles.title}>{t("Nước uống")}</Text>
        <Text style={styles.value}>
          {water ? t("{value1} / {value2} lít", { value1: liters(water.amount), value2: liters(water.target) }) : "…"}
          {reached ? " ✓" : ""}
        </Text>
      </View>
      <View style={styles.track} accessibilityLabel={t("Đã uống {value1}% mục tiêu", { value1: Math.round(ratio * 100) })}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Bớt 250 ml")}
          disabled={busy || !water || water.amount === 0}
          onPress={() => add(-250)}
          style={({ pressed }) => [
            styles.button,
            styles.minus,
            (pressed || busy || !water?.amount) && styles.dim,
          ]}
        >
          <Ionicons name="remove" size={18} color={colors.water} />
        </Pressable>
        {STEPS.map((step) => (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={t("Thêm {value1} ml", { value1: step })}
            disabled={busy}
            onPress={() => add(step)}
            style={({ pressed }) => [styles.button, styles.flex, (pressed || busy) && styles.dim]}
          >
            <Text style={styles.buttonText}>+{step} ml</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.reminder}>{t("Khát thì uống, đừng nhịn khát. Nhớ uống nước đều trong ngày, không cần ép bản thân uống thật nhiều.")}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  flex: { flexGrow: 1, flexShrink: 1, flexBasis: 80 },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  title: { flexGrow: 1, flexShrink: 1, flexBasis: 100, minWidth: 0, fontSize: 16, fontWeight: "700", color: colors.text },
  value: { maxWidth: "100%", flexShrink: 1, marginLeft: "auto", textAlign: "right", fontSize: 14, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.water },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.waterSoft, paddingHorizontal: spacing.xs },
  minus: { width: 48 },
  buttonText: { maxWidth: "100%", textAlign: "center", fontSize: 15, fontWeight: "600", color: colors.waterText },
  dim: { opacity: 0.5 },
  reminder: { fontSize: 13, lineHeight: 20, color: colors.waterText },
  error: { fontSize: 13, color: colors.danger },
}));
