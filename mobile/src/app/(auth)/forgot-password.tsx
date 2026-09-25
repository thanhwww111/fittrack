import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { passwordResetApi } from "@/api/authApi";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, themedStyles } from "@/constants/theme";
import { errorMessage, validateEmail } from "@/lib/formErrors";

// Bước 1: nhập email để nhận mã 6 số
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return;

    setSending(true);
    try {
      await passwordResetApi.request(email.trim());
      router.push({ pathname: "/reset-password", params: { email: email.trim() } });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthForm
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, FitTrack sẽ gửi cho bạn mã 6 số để đặt lại mật khẩu."
      footer={
        <Link href="/login" style={styles.link}>
          Quay lại đăng nhập
        </Link>
      }
    >
      <ErrorBanner message={formError} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Gửi mã" onPress={handleSubmit} loading={sending} />
      <Text style={styles.muted}>Không thấy email? Kiểm tra thư mục Spam hoặc Quảng cáo.</Text>
    </AuthForm>
  );
}

const styles = themedStyles(() => ({
  muted: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  link: { color: colors.primary, fontSize: 15, fontWeight: "600" },
}));
