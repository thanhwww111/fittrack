import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  suffix?: string;
}

export function TextField({ label, error, suffix, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          accessibilityLabel={label}
          {...inputProps}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: "500", color: colors.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 48, fontSize: 16, color: colors.text },
  suffix: { fontSize: 14, color: colors.textMuted, marginLeft: spacing.sm },
  error: { fontSize: 13, color: colors.danger },
});
