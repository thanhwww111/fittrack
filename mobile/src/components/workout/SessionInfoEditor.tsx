import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { spacing, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/formErrors";

interface SessionInfoEditorProps {
  name: string;
  notes: string;
  onSave: (input: { name: string; notes: string }) => Promise<void>;
  onClose: () => void;
}

// Sửa tên + ghi chú buổi tập (vd "Vai hơi đau, giảm tạ tuần sau")
export function SessionInfoEditor({ name: initialName, notes: initialNotes, onSave, onClose }: SessionInfoEditorProps) {
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [nameError, setNameError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setNameError("Vui lòng nhập tên buổi tập");
      return;
    }
    setNameError(undefined);
    setError(null);
    setSaving(true);
    try {
      await onSave({ name: name.trim(), notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Card title="Tên & ghi chú">
      <ErrorBanner message={error} />
      <TextField label="Tên buổi tập" value={name} onChangeText={setName} error={nameError} maxLength={100} />
      <TextField
        label="Ghi chú"
        value={notes}
        onChangeText={setNotes}
        placeholder="Cảm giác, chấn thương, điều cần nhớ lần sau…"
        multiline
        maxLength={1000}
        style={styles.notes}
      />
      <View style={styles.actions}>
        <Button title="Huỷ" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title="Lưu" onPress={handleSave} loading={saving} style={styles.flex} />
      </View>
    </Card>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.md },
  notes: { minHeight: 80, textAlignVertical: "top" },
}));
