import { Pressable, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { parseNumber } from "@/lib/formErrors";

interface NumberStepperProps {
  value: string;
  onChangeText: (value: string) => void;
  label: string;
  min: number;
  max: number;
  decimal?: boolean;
  positive?: boolean;
  disabled?: boolean;
  error?: boolean;
}

export function NumberStepper({
  value, onChangeText, label, min, max, decimal = false,
  positive = false, disabled = false, error = false,
}: NumberStepperProps) {
  const parsed = parseNumber(value);
  const current = parsed !== null && Number.isFinite(parsed) ? parsed : null;
  function nextValue(direction: number) {
    const next = current === null ? Math.max(min, 1) : current + direction;
    return Math.min(max, Math.max(min, decimal ? Number(next.toFixed(8)) : Math.round(next)));
  }

  return (
    <View style={[styles.row, error && styles.error]}>
      {([-1, 1] as const).map((direction) => {
        const next = nextValue(direction);
        const blocked = disabled || (positive && next <= 0) || next === current;
        const button = (
          <Pressable
            key={direction}
            accessibilityRole="button"
            accessibilityLabel={`${direction < 0 ? "Giảm" : "Tăng"} ${label}`}
            accessibilityState={{ disabled: blocked }}
            disabled={blocked}
            onPress={() => onChangeText(String(next))}
            style={({ pressed }) => [styles.button, (blocked || pressed) && styles.dimmed]}
          >
            <Text style={styles.symbol}>{direction < 0 ? "−" : "+"}</Text>
          </Pressable>
        );
        return direction < 0 ? button : (
          <View key="value-and-plus" style={styles.valueAndPlus}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              accessibilityLabel={label}
              keyboardType={decimal ? "decimal-pad" : "number-pad"}
              editable={!disabled}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {button}
          </View>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.surface, overflow: "hidden" },
  valueAndPlus: { flex: 1, flexDirection: "row", alignItems: "center" },
  button: { width: 44, minHeight: 48, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primarySoft },
  symbol: { fontSize: 24, color: colors.primary, fontWeight: "600" },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: spacing.xs,
    textAlign: "center", fontSize: 16, color: colors.text },
  dimmed: { opacity: 0.4 },
  error: { borderColor: colors.danger },
}));
