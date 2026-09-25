import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ApiError } from "@/api/client";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/theme";
import {
  errorMessage,
  fieldErrorsFrom,
  validateEmail,
  validatePassword,
  type FieldErrors,
} from "@/lib/formErrors";
import { useAuthStore } from "@/stores/authStore";

type Field = "name" | "email" | "password" | "confirmPassword";

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors: FieldErrors<Field> = {
      name: name.trim() ? undefined : "Vui lòng nhập tên",
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: password === confirmPassword ? undefined : "Mật khẩu nhập lại không khớp",
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: "Email này đã được đăng ký" });
      } else {
        setErrors(fieldErrorsFrom(err));
        setFormError(errorMessage(err));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthForm
      title="Tạo tài khoản"
      subtitle="Chỉ mất một phút để bắt đầu"
      footer={
        <>
          <Text style={styles.muted}>Đã có tài khoản?</Text>
          <Link href="/login" style={styles.link}>
            Đăng nhập
          </Link>
        </>
      }
    >
      <ErrorBanner message={formError} />
      <TextField
        label="Tên"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Tối thiểu 8 ký tự"
      />
      <TextField
        label="Nhập lại mật khẩu"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Đăng ký" onPress={handleSubmit} loading={submitting} />
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 15 },
  link: { color: colors.primary, fontSize: 15, fontWeight: "600" },
});
