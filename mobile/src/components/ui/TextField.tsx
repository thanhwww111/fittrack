import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { localizeMessage, useTranslation } from "@/i18n";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable } from "./AppPressable";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  suffix?: string;
}

export function TextField({ label, error, suffix, style, secureTextEntry, ...inputProps }: TextFieldProps) {
  const { locale, t } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          accessibilityLabel={label}
          {...inputProps}
          secureTextEntry={secureTextEntry ? !passwordVisible : secureTextEntry}
        />
        {secureTextEntry ? (
          <AppPressable
            appearance="plain"
            accessibilityRole="button"
            accessibilityLabel={t(passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}
            onPress={() => setPasswordVisible(visible => !visible)}
            style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
          </AppPressable>
        ) : null}
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{localizeMessage(locale, error)}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
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
}));
