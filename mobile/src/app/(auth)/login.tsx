import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/theme";
import { errorMessage, validateEmail, type FieldErrors } from "@/lib/formErrors";
import { useAuthStore } from "@/stores/authStore";

type Field = "email" | "password";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors: FieldErrors<Field> = {
      email: validateEmail(email),
      password: password ? undefined : "Vui lòng nhập mật khẩu",
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);
    try {
      // Thành công thì authStore đổi status, Stack.Protected tự chuyển sang (tabs)
      await login({ email: email.trim(), password });
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Đăng nhập"
      subtitle="Theo dõi dinh dưỡng và buổi tập của bạn"
      footer={
        <>
          <Text style={styles.muted}>Chưa có tài khoản?</Text>
          <Link href="/register" style={styles.link}>
            Đăng ký
          </Link>
        </>
      }
    >
      <ErrorBanner message={formError} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="ban@example.com"
      />
      <TextField
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Đăng nhập" onPress={handleSubmit} loading={submitting} />
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 15 },
  link: { color: colors.primary, fontSize: 15, fontWeight: "600" },
});
