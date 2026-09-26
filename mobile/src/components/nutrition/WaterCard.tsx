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
  (ml / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

// Theo dõi nước uống của ngày đang xem. Bấm +250 / +500 ml, "−" để bớt khi bấm nhầm.
// onChange: báo số nước mới cho màn cha (ô thống kê trang chủ) mỗi lần tải / cập nhật
export function WaterCard({ date, onChange }: { date: string; onChange?: (water: WaterDay) => void }) {
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
        <Text style={styles.title}>Nước uống</Text>
        <Text style={styles.value}>
          {water ? `${liters(water.amount)} / ${liters(water.target)} lít` : "…"}
          {reached ? " ✓" : ""}
        </Text>
      </View>
      <View style={styles.track} accessibilityLabel={`Đã uống ${Math.round(ratio * 100)}% mục tiêu`}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bớt 250 ml"
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
            accessibilityLabel={`Thêm ${step} ml`}
            disabled={busy}
            onPress={() => add(step)}
            style={({ pressed }) => [styles.button, styles.flex, (pressed || busy) && styles.dim]}
          >
            <Text style={styles.buttonText}>+{step} ml</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  value: { fontSize: 14, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.water },
  actions: { flexDirection: "row", gap: spacing.sm },
  button: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.waterSoft,
  },
  minus: { width: 48 },
  buttonText: { fontSize: 15, fontWeight: "600", color: colors.waterText },
  dim: { opacity: 0.5 },
  error: { fontSize: 13, color: colors.danger },
}));
