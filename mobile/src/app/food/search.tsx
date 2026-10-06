import { translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { foodApi } from "@/api/foodApi";
import { MacroChips } from "@/components/nutrition/MacroChips";
import { AddMealForm } from "@/components/nutrition/AddMealForm";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { useFoodSearch } from "@/hooks/useFoodSearch";
import { useMeals } from "@/hooks/useMeals";
import { formatServing, isMealType, mealLabel, mealTypeForHour } from "@/lib/nutrition";
import type { Food, MealType } from "@/types/models";

export default function FoodSearchScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();
  const { meals, error, load } = useMeals();
  const [mealType, setMealType] = useState<MealType>(() =>
    isMealType(params.mealType)
      ? params.mealType
      : mealTypeForHour(new Date().getHours())
  );
  // Thêm từ một bữa cụ thể đã có mealType; Ghi món ở Trang chủ chưa có.
  const [choosingMeal, setChoosingMeal] = useState(
    () => !isMealType(params.mealType)
  );

  if (choosingMeal) {
    return (
      <ScrollView contentContainerStyle={styles.mealContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{t("Bạn muốn ghi món vào bữa nào?")}</Text>
        <Text style={styles.hint}>{t("Đã chọn sẵn bữa ăn. Bạn có thể đổi bữa để ghi bổ sung những gì đã ăn.")}</Text>
        <ErrorBanner message={error} />
        {error ? <Button title={t("Tải lại danh sách bữa")} variant="secondary" onPress={load} /> : null}
        <View accessibilityRole="radiogroup" style={styles.mealOptions}>
          {meals.map((meal) => {
            const selected = meal.id === mealType;
            return (
              <Pressable
                key={meal.id}
                accessibilityRole="radio"
                accessibilityLabel={meal.name}
                accessibilityState={{ selected }}
                onPress={() => setMealType(meal.id)}
                style={({ pressed }) => [styles.mealOption, selected && styles.mealSelected, pressed && styles.pressed]}
              >
                <Text style={styles.name}>{meal.name}</Text>
                <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={24} color={selected ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
        <AddMealForm onAdded={setMealType} />
        <Button title={t("Tiếp tục chọn món")} onPress={() => setChoosingMeal(false)} />
      </ScrollView>
    );
  }

  return <FoodSearchResults mealType={mealType} mealName={mealLabel(mealType, meals)} date={params.date} onChangeMeal={() => setChoosingMeal(true)} />;
}

function FoodSearchResults({ mealType, mealName, date, onChangeMeal }: {
  mealType: MealType;
  mealName: string;
  date?: string;
  onChangeMeal: () => void;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const [query, setQuery] = useState("");
  const { items, isLoading, error, loadMore, refresh } = useFoodSearch(query);

  // Quay lại từ màn khác (có thể vừa sửa / xoá món) thì tải lại; lần focus đầu hook đã tự tải
  const focusedOnce = useRef(false);
  const [recent, setRecent] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<Food[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) refresh();
      focusedOnce.current = true;
      // Món yêu thích / gần đây chỉ để thêm nhanh, lỗi thì bỏ qua
      foodApi.favorites().then(setFavorites).catch(() => {});
      foodApi.recent(8).then(setRecent).catch(() => {});
    }, [refresh])
  );

  function openFood(food: Food) {
    router.push({
      pathname: "/food/add",
      params: { foodId: food.id, ...(mealType && { mealType }), ...(date && { date }) },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.mealSummary}>
        <Text style={styles.name}>{mealName}</Text>
        <Pressable accessibilityRole="button" onPress={onChangeMeal} style={styles.changeMeal}>
          <Text style={styles.createText}>{t("Đổi bữa")}</Text>
        </Pressable>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("Tìm món ăn, ví dụ: chicken")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t("Tìm món ăn")}
        />
        {query ? (
          <Pressable accessibilityLabel={t("Xoá từ khoá")} hitSlop={8} onPress={() => setQuery("")}>
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
        ListHeaderComponent={
          !query.trim() && (favorites.length > 0 || recent.length > 0) ? (
            <View style={styles.recent}>
              <QuickFoods title={t("⭐ Yêu thích")} foods={favorites} onPick={openFood} />
              <QuickFoods title={t("Gần đây")} foods={recent} onPick={openFood} />
              <Text style={styles.sectionTitle}>{t("Tất cả món")}</Text>
            </View>
          ) : null
        }
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
              {item.isCustom ? <Text style={styles.badge}>{t("Của bạn")}</Text> : null}
            </View>
            <Text style={styles.serving}>{t("mỗi {value1}", { value1: formatServing(item.servingSize, item.servingUnit) })}</Text>
            <MacroChips values={item} />
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={styles.empty}>{t("Không tìm thấy món nào{value1}.", { value1: query ? ` cho "${query}"` : "" })}</Text>
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
              <Text style={styles.createText}>{t("Không có món bạn cần? Tạo món mới")}</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

// Hàng chip để thêm nhanh một món (yêu thích / gần đây)
function QuickFoods({ title, foods, onPick }: { title: string; foods: Food[]; onPick: (food: Food) => void }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  if (foods.length === 0) return null;
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.recentChips}>
        {foods.map((food) => (
          <Pressable
            key={food.id}
            accessibilityRole="button"
            accessibilityLabel={t("Thêm {value1}", { value1: food.name })}
            onPress={() => onPick(food)}
            style={({ pressed }) => [styles.recentChip, pressed && styles.pressed]}
          >
            <Text style={styles.recentText} numberOfLines={1}>
              {food.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = themedStyles(() => ({
  mealContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  hint: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  mealOptions: { gap: spacing.md },
  mealOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    minHeight: 64, padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface },
  mealSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  mealSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  changeMeal: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  recent: { gap: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  recentChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  recentChip: {
    maxWidth: "100%",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  recentText: { fontSize: 14, fontWeight: "500", color: colors.primary },
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
}));
