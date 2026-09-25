import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { accountApi } from "@/api/authApi";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing } from "@/constants/theme";
import { pickAvatar } from "@/lib/avatar";
import { confirmAction } from "@/lib/confirm";
import {
  errorMessage,
  fieldErrorsFrom,
  validatePassword,
  type FieldErrors,
} from "@/lib/formErrors";
import { useAuthStore } from "@/stores/authStore";

export default function AccountScreen() {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NameForm />
        <PasswordForm />
        <DeleteAccount />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NameForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên");
      return;
    }
    setError(undefined);
    setNotice(null);
    setSaving(true);
    try {
      setUser(await accountApi.updateMe({ name: name.trim() }));
      setNotice("Đã đổi tên.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeAvatar() {
    setError(undefined);
    setNotice(null);
    try {
      const avatar = await pickAvatar();
      if (!avatar) return;
      setUploading(true);
      setUser(await accountApi.updateMe({ avatar }));
      setNotice("Đã đổi ảnh đại diện.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    try {
      setUser(await accountApi.updateMe({ avatar: null }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card title="Thông tin tài khoản">
      <View style={styles.avatarRow}>
        <Avatar name={user?.name} uri={user?.avatar} size={72} />
        <View style={styles.avatarActions}>
          <Button
            title={user?.avatar ? "Đổi ảnh" : "Chọn ảnh đại diện"}
            variant="secondary"
            onPress={changeAvatar}
            loading={uploading}
          />
          {user?.avatar ? (
            <Pressable accessibilityRole="button" onPress={removeAvatar} disabled={uploading} hitSlop={6}>
              <Text style={styles.removeText}>Gỡ ảnh</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={styles.muted}>Email: {user?.email}</Text>
      <TextField label="Tên hiển thị" value={name} onChangeText={setName} error={error} maxLength={100} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Button
        title="Lưu tên"
        variant="secondary"
        onPress={handleSave}
        loading={saving}
        disabled={name.trim() === user?.name}
      />
    </Card>
  );
}

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

function PasswordForm() {
  const replaceSession = useAuthStore((s) => s.replaceSession);
  const [values, setValues] = useState<Record<PasswordField, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors<PasswordField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: PasswordField) => (text: string) => setValues((v) => ({ ...v, [key]: text }));

  async function handleSubmit() {
    const next: FieldErrors<PasswordField> = {
      currentPassword: values.currentPassword ? undefined : "Nhập mật khẩu hiện tại",
      newPassword:
        validatePassword(values.newPassword) ??
        (values.newPassword === values.currentPassword ? "Mật khẩu mới phải khác mật khẩu cũ" : undefined),
      confirmPassword:
        values.newPassword === values.confirmPassword ? undefined : "Mật khẩu nhập lại không khớp",
    };
    setErrors(next);
    setFormError(null);
    setNotice(null);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      const result = await accountApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await replaceSession(result);
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.");
    } catch (err) {
      const fields = fieldErrorsFrom(err) as FieldErrors<PasswordField>;
      if (fields.currentPassword) fields.currentPassword = "Mật khẩu hiện tại không đúng";
      setErrors(fields);
      if (!fields.currentPassword) setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Đổi mật khẩu">
      <ErrorBanner message={formError} />
      <TextField
        label="Mật khẩu hiện tại"
        value={values.currentPassword}
        onChangeText={set("currentPassword")}
        error={errors.currentPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label="Mật khẩu mới"
        value={values.newPassword}
        onChangeText={set("newPassword")}
        error={errors.newPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Tối thiểu 8 ký tự"
      />
      <TextField
        label="Nhập lại mật khẩu mới"
        value={values.confirmPassword}
        onChangeText={set("confirmPassword")}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Button title="Đổi mật khẩu" onPress={handleSubmit} loading={saving} />
    </Card>
  );
}

function DeleteAccount() {
  const clearLocalSession = useAuthStore((s) => s.clearLocalSession);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!password) {
      setError("Nhập mật khẩu để xác nhận");
      return;
    }
    const ok = await confirmAction({
      title: "Xoá vĩnh viễn tài khoản?",
      message:
        "Toàn bộ nhật ký ăn uống, buổi tập, số đo và cài đặt sẽ bị xoá và không thể khôi phục.",
      confirmText: "Xoá tài khoản",
      destructive: true,
    });
    if (!ok) return;

    setError(undefined);
    setDeleting(true);
    try {
      // Server xoá luôn thiết bị nhận push; resetOnLogout huỷ lịch nhắc cục bộ
      await accountApi.deleteAccount(password);
      // Stack.Protected tự đưa về màn đăng nhập
      await clearLocalSession();
    } catch (err) {
      const fields = fieldErrorsFrom(err);
      setError(fields.password ? "Mật khẩu không đúng" : errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Card title="Xoá tài khoản">
      <Text style={styles.muted}>
        Xoá vĩnh viễn tài khoản và mọi dữ liệu của bạn trên FitTrack. Không thể hoàn tác.
      </Text>
      <TextField
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        error={error}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <Button title="Xoá tài khoản" variant="danger" onPress={handleDelete} loading={deleting} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  notice: { fontSize: 14, color: colors.success },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatarActions: { flex: 1, gap: spacing.sm },
  removeText: { fontSize: 14, fontWeight: "600", color: colors.danger, textAlign: "center" },
});
