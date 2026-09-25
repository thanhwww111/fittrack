import { useEffect, useRef, useState } from "react";
import { Pressable, Text, Vibration, View } from "react-native";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { formatClock } from "@/lib/workout";

interface RestTimerProps {
  endsAt: number; // timestamp (ms)
  onAdjust: (deltaSeconds: number) => void;
  onDismiss: () => void;
}

// Đếm ngược thời gian nghỉ giữa các set, rung máy khi hết giờ
export function RestTimer({ endsAt, onAdjust, onDismiss }: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const vibrated = useRef(false);

  useEffect(() => {
    vibrated.current = false;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt && !vibrated.current) {
        vibrated.current = true;
        Vibration.vibrate(500);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [endsAt]);

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const done = remaining === 0;

  return (
    <View style={[styles.bar, done && styles.barDone]} accessibilityLiveRegion="polite">
      <Text style={styles.label}>{done ? "Hết giờ nghỉ!" : "Nghỉ"}</Text>
      <Text style={styles.time}>{formatClock(remaining)}</Text>
      <View style={styles.actions}>
        <SmallButton label="−15s" onPress={() => onAdjust(-15)} />
        <SmallButton label="+15s" onPress={() => onAdjust(15)} />
        <SmallButton label={done ? "Đóng" : "Bỏ qua"} onPress={onDismiss} />
      </View>
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button} hitSlop={4}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.inverse,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  barDone: { backgroundColor: colors.success },
  label: { color: colors.onPrimary, fontSize: 14 },
  time: { color: colors.onPrimary, fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"], flex: 1 },
  actions: { flexDirection: "row", gap: spacing.xs },
  button: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  buttonText: { color: colors.onPrimary, fontSize: 13, fontWeight: "600" },
}));
