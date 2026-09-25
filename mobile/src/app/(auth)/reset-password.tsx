import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { passwordResetApi } from "@/api/authApi";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, themedStyles } from "@/constants/theme";
import { errorMessage, fieldErrorsFrom, validatePassword, type FieldErrors } from "@/lib/formErrors";
import { useAuthStore } from "@/stores/authStore";

type Field = "code" | "newPassword" | "confirmPassword";

// Bước 2: nhập mã trong email + mật khẩu mới. Thành công thì đăng nhập luôn.
export default function ResetPasswordScreen() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const replaceSession = useAuthStore((s) => s.replaceSession);

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit() {
    const next: FieldErrors<Field> = {
      code: /^\d{6}$/.test(code.trim()) ? undefined : "Mã gồm 6 chữ số",
      newPassword: validatePassword(newPassword),
      confirmPassword: newPassword === confirmPassword ? undefined : "Mật khẩu nhập lại không khớp",
    };
    setErrors(next);
    setFormError(null);
    setNotice(null);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    try {
      const result = await passwordResetApi.reset({ email, code: code.trim(), newPassword });
      // Stack.Protected tự chuyển sang (tabs) khi đã đăng nhập
      await replaceSession(result);
    } catch (err) {
      const fields = fieldErrorsFrom(err) as FieldErrors<Field>;
      if (fields.code) fields.code = "Mã không đúng hoặc đã hết hạn";
      setErrors(fields);
      if (!fields.code) setFormError(errorMessage(err));
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    setFormError(null);
    try {
      await passwordResetApi.request(email);
      setNotice("Nếu đã quá 1 phút kể từ lần gửi trước, mã mới sẽ được gửi tới email. Mã cũ không còn dùng được.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setResending(false);
    }
  }

  if (!email) return <Redirect href="/forgot-password" />;

  return (
    <AuthForm
      title="Đặt lại mật khẩu"
      subtitle={`Nhập mã 6 số đã gửi tới ${email}. Mã có hiệu lực trong 15 phút.`}
      footer={
        <Link href="/login" style={styles.link}>
          Quay lại đăng nhập
        </Link>
      }
    >
      <ErrorBanner message={formError} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <TextField
        label="Mã xác nhận"
        value={code}
        onChangeText={setCode}
        error={errors.code}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        placeholder="123456"
      />
      <TextField
        label="Mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        error={errors.newPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Tối thiểu 8 ký tự"
      />
      <TextField
        label="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Đặt lại mật khẩu" onPress={handleSubmit} loading={submitting} />
      <Pressable accessibilityRole="button" onPress={resend} disabled={resending} hitSlop={8}>
        <Text style={[styles.link, styles.center]}>{resending ? "Đang gửi…" : "Gửi lại mã"}</Text>
      </Pressable>
    </AuthForm>
  );
}

const styles = themedStyles(() => ({
  link: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  center: { textAlign: "center" },
  notice: { color: colors.success, fontSize: 14 },
}));
