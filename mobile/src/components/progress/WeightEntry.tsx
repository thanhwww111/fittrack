import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { measurementApi } from "@/api/progressApi";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { colors, spacing } from "@/constants/theme";
import { errorMessage, parseNumber } from "@/lib/formErrors";

interface WeightEntryProps {
  initialWeight: number | null;
  onSaved: () => void;
}

// Ghi cân nặng hôm nay. Nhập lại trong ngày thì server ghi đè bản ghi cũ.
export function WeightEntry({ initialWeight, onSaved }: WeightEntryProps) {
  const [value, setValue] = useState(initialWeight != null ? String(initialWeight) : "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const weight = parseNumber(value);
    if (weight === null || Number.isNaN(weight) || weight < 20 || weight > 500) {
      setError("Nhập cân nặng từ 20 đến 500 kg");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await measurementApi.save({ weight });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Cân nặng hôm nay"
            suffix="kg"
            value={value}
            onChangeText={(text) => {
              setValue(text);
              setSaved(false);
            }}
            error={error}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
        <Button title="Lưu" onPress={handleSave} loading={saving} style={styles.button} />
      </View>
      {saved ? <Text style={styles.saved}>Đã lưu cân nặng hôm nay.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  flex: { flex: 1 },
  // Căn nút ngang với ô nhập (bỏ qua chiều cao nhãn phía trên)
  button: { marginTop: 22 },
  saved: { fontSize: 13, color: colors.success },
});
