import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { colors, radius, spacing } from "@/constants/theme";
import { useFoodSearch } from "@/hooks/useFoodSearch";
import { formatServing } from "@/lib/nutrition";
import type { Food } from "@/types/models";

export default function FoodSearchScreen() {
  // mealType + date truyền tiếp sang màn add để biết thêm vào bữa nào, ngày nào
  const { mealType, date } = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const [query, setQuery] = useState("");
  const { items, isLoading, error, loadMore } = useFoodSearch(query);

  function openFood(food: Food) {
    router.push({
      pathname: "/food/add",
      params: { foodId: food.id, ...(mealType && { mealType }), ...(date && { date }) },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm món ăn, ví dụ: chicken"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Tìm món ăn"
        />
        {query ? (
          <Pressable accessibilityLabel="Xoá từ khoá" hitSlop={8} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ErrorBanner message={error} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openFood(item)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isCustom ? <Text style={styles.badge}>Của bạn</Text> : null}
            </View>
            <Text style={styles.serving}>
              mỗi {formatServing(item.servingSize, item.servingUnit)}
            </Text>
            <MacroChips values={item} />
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={styles.empty}>Không tìm thấy món nào{query ? ` cho "${query}"` : ""}.</Text>
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/food/create",
                  params: {
                    ...(query.trim() && { name: query.trim() }),
                    ...(mealType && { mealType }),
                    ...(date && { date }),
                  },
                })
              }
              style={styles.createButton}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.createText}>Không có món bạn cần? Tạo món mới</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 16, color: colors.text },
  list: { gap: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  badge: {
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  serving: { fontSize: 13, color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.xl },
  footer: { gap: spacing.md, paddingTop: spacing.sm },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  createText: { fontSize: 15, color: colors.primary, fontWeight: "600" },
});
