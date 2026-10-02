import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { aiApi } from "@/api/aiApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TextField } from "@/components/ui/TextField";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { aiErrorMessage } from "@/lib/aiErrors";
import { formatServing } from "@/lib/nutrition";
import type { FoodNutritionEstimate } from "@/types/models";
import { MacroChips } from "./MacroChips";

interface Props {
  foodName: string;
  disabled: boolean;
  onApply: (suggestion: FoodNutritionEstimate) => void;
}

export function FoodAiHelper({ foodName, disabled, onApply }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<FoodNutritionEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);

  async function estimate() {
    const query = description.trim();
    if (!query || loading || disabled) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setApplied(null);
    setSuggestions([]);
    try {
      const result = await aiApi.estimateFood({ description: query });
      if (id === requestId.current) setSuggestions(result.suggestions);
    } catch (err) {
      if (id === requestId.current) setError(aiErrorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function searchOnline() {
    const query = `${description.trim()} dinh dưỡng calories protein carbs fat`;
    try {
      await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    } catch {
      setError("Không mở được trình duyệt. Bạn có thể thử lại liên kết tìm kiếm.");
    }
  }

  if (!expanded) {
    return <Button title="AI hỗ trợ dinh dưỡng" variant="secondary" disabled={disabled}
      onPress={() => { setDescription(foodName); setExpanded(true); }} />;
  }

  return (
    <Card title="AI hỗ trợ dinh dưỡng">
      <Text style={styles.hint}>Mô tả món và lượng đã ăn, ví dụ: 1 miếng sandwich nhỏ có trứng, không sốt.</Text>
      <TextField
        label="Mô tả món ăn"
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          setSuggestions([]);
          setApplied(null);
          setError(null);
        }}
        maxLength={500}
        multiline
        editable={!loading && !disabled}
      />
      <Button title="Đề xuất dinh dưỡng" onPress={estimate} loading={loading}
        disabled={disabled || !description.trim()} />
      <ErrorBanner message={error} />
      <Text style={styles.hint}>Dinh dưỡng ước tính bằng AI, chưa được xác minh từ nguồn bên ngoài. Kiểm tra khẩu phần và chỉnh lại nếu cần.</Text>
      {suggestions.map((suggestion, index) => (
        <View key={index} style={styles.suggestion}>
          <Text style={styles.name}>{suggestion.name}</Text>
          <Text style={styles.hint}>Cho {formatServing(suggestion.servingSize, suggestion.servingUnit)} · {suggestion.description}</Text>
          <MacroChips values={suggestion} />
          <Text style={styles.hint}>Chất xơ: {suggestion.fiber.toLocaleString("vi-VN")} g</Text>
          <Button title={applied === index ? "Đã điền vào form" : "Dùng lựa chọn này"}
            variant="secondary" disabled={disabled || loading}
            onPress={() => { onApply(suggestion); setApplied(index); }} />
        </View>
      ))}
      {applied !== null ? <Text style={styles.hint}>Đã điền thông tin bên dưới. Bạn có thể sửa rồi bấm “Tạo món” để lưu.</Text> : null}
      {description.trim() ? (
        <Pressable accessibilityRole="link" onPress={searchOnline} style={styles.searchLink}>
          <Text style={styles.linkText}>Tìm dinh dưỡng món này trên Google</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  hint: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  suggestion: { gap: spacing.sm, padding: spacing.md, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.md },
  searchLink: { minHeight: 44, justifyContent: "center" },
  linkText: { color: colors.primaryText, fontSize: 14, textDecorationLine: "underline" },
}));
