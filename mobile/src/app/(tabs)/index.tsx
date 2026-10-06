import { localeTag , translate as t, useTranslation } from "@/i18n";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { MacroBars } from "@/components/nutrition/MacroBars";
import { WaterCard } from "@/components/nutrition/WaterCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { GradientView } from "@/components/ui/GradientView";
import { RingProgress } from "@/components/ui/RingProgress";
import { StatTile } from "@/components/ui/StatTile";
import { TodayWorkoutCard } from "@/components/workout/TodayWorkoutCard";
import { colors, radius, shadow, spacing, themedStyles } from "@/constants/theme";
import { useDashboard } from "@/hooks/useDashboard";
import { localToday } from "@/hooks/useProgress";
import { formatDayAdherence, formatSignedPercent } from "@/lib/weekly";
import { formatDuration, formatVolume } from "@/lib/workout";
import { useAuthStore } from "@/stores/authStore";
import type { WaterDay } from "@/types/models";

function greeting(hour: number) {
  if (hour < 11) return t("Chào buổi sáng");
  if (hour < 14) return t("Chào buổi trưa");
  if (hour < 18) return t("Chào buổi chiều");
  return t("Chào buổi tối");
}

function formatNumber(value: number) {
  return value.toLocaleString(localeTag(), { maximumFractionDigits: 1 });
}

const liters = (ml: number) => (ml / 1000).toLocaleString(localeTag(), { maximumFractionDigits: 1 });

export default function HomeScreen() {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data, error, isLoading, isRefreshing, refresh } = useDashboard();
  // WaterCard tự tải nước của hôm nay và báo lên đây cho ô thống kê
  const [water, setWater] = useState<WaterDay | null>(null);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const nutrition = data?.nutrition;
  const weekly = data?.weekly;
  const weightChange = weekly?.weight.change;
  const sessionTarget = weekly?.adherence.workout.target ?? null;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
    >
      <GradientView style={styles.hero}>
        <Text style={styles.greeting}>{greeting(new Date().getHours())}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name} 👋
        </Text>
        {weekly?.weight.current != null ? (
          <View style={styles.weightRow}>
            <Text style={styles.weight} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatNumber(weekly.weight.current)} kg</Text>
            {weightChange != null ? (
              <View style={styles.pill}>
                <Ionicons
                  name={weightChange > 0 ? "trending-up" : weightChange < 0 ? "trending-down" : "remove"}
                  size={14}
                  color={colors.onGradient}
                />
                <Text style={styles.pillText}>{t("{value1} {value2} kg tuần này", { value1: weightChange > 0 ? "+" : "", value2: formatNumber(weightChange) })}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {nutrition && weekly ? (
          <View style={styles.rings}>
            <HeroRing
              label="Kcal"
              value={formatNumber(Math.round(nutrition.consumed.calories))}
              detail={
                nutrition.remaining
                  ? t("còn {value1}", { value1: formatNumber(Math.max(0, Math.round(nutrition.remaining.calories))) })
                  : t("chưa có mục tiêu")
              }
              progress={nutrition.target ? nutrition.consumed.calories / nutrition.target.calories : 0}
            />
            <HeroRing
              label="Protein"
              value={`${Math.round(nutrition.consumed.protein)}g`}
              detail={nutrition.target ? `/ ${nutrition.target.protein}g` : t("chưa có mục tiêu")}
              progress={nutrition.target ? nutrition.consumed.protein / nutrition.target.protein : 0}
            />
            <HeroRing
              label={t("Buổi tập")}
              value={sessionTarget ? `${weekly.workout.sessions}/${sessionTarget}` : String(weekly.workout.sessions)}
              detail={t("tuần này")}
              progress={sessionTarget ? weekly.workout.sessions / sessionTarget : 0}
            />
          </View>
        ) : null}
      </GradientView>
      <Button title={t("Lịch sử theo ngày")} variant="secondary" onPress={() => router.push("/history")} />

      {weekly ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Thống kê nhanh")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tiles}
            // Bóng đổ của ô không bị cắt ở mép dưới
            style={styles.tilesScroll}
          >
            <StatTile
              icon="flame"
              label={t("Chuỗi ngày")}
              value={t("{value1} ngày", { value1: weekly.streak })}
              hint={weekly.streak > 0 ? t("giữ lửa nhé!") : t("bắt đầu hôm nay")}
              tint={colors.streak}
              tintSoft={colors.streakSoft}
            />
            <StatTile
              icon="barbell"
              label={t("Volume tuần")}
              value={formatVolume(weekly.workout.totalVolume)}
              hint={
                weekly.workout.volumeChange !== null
                  ? t("{value1} tuần trước", { value1: formatSignedPercent(weekly.workout.volumeChange) })
                  : t("tuần đầu tiên")
              }
              tint={colors.primary}
              tintSoft={colors.primarySoft}
            />
            <StatTile
              icon="trophy"
              label={t("PR mới")}
              value={String(weekly.newPersonalRecords)}
              hint={t("trong tuần")}
              tint={colors.highlightText}
              tintSoft={colors.highlight}
            />
            <StatTile
              icon="water"
              label={t("Nước")}
              value={water ? `${liters(water.amount)} L` : "—"}
              hint={water ? `/ ${liters(water.target)} L` : undefined}
              tint={colors.water}
              tintSoft={colors.waterSoft}
            />
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.quickRow}>
        <QuickAction
          icon="restaurant"
          label={t("Ghi món")}
          onPress={() => router.push("/food/search")}
        />
        <QuickAction
          icon="scale"
          label={t("Cân nặng")}
          onPress={() => router.push({ pathname: "/measurements/edit", params: { date: localToday() } })}
        />
        <QuickAction icon="barbell" label={t("Tập luyện")} onPress={() => router.push("/workout")} />
      </View>

      <ErrorBanner message={error} />

      {nutrition ? (
        <Card title={t("Dinh dưỡng hôm nay")} icon="nutrition">
          {nutrition.target ? (
            <MacroBars consumed={nutrition.consumed} target={nutrition.target} />
          ) : (
            <>
              <Text style={styles.muted}>{t("Bạn chưa có mục tiêu dinh dưỡng. Hoàn thiện hồ sơ để FitTrack tính calo và macro phù hợp.")}</Text>
              <Link href="/profile" asChild>
                <Button title={t("Thiết lập hồ sơ")} onPress={() => {}} variant="secondary" />
              </Link>
            </>
          )}
        </Card>
      ) : null}

      {nutrition ? <WaterCard date={nutrition.date} onChange={setWater} /> : null}

      {data ? (
        <TodayWorkoutCard
          active={data.workoutToday.active}
          completed={data.workoutToday.completed}
        />
      ) : null}

      {weekly ? (
        <Card title={t("Tuần này")} icon="calendar">
          <View style={styles.statsRow}>
            <Stat
              label={t("Buổi tập")}
              value={
                weekly.adherence.workout.target
                  ? `${weekly.workout.sessions}/${weekly.adherence.workout.target}`
                  : String(weekly.workout.sessions)
              }
              hint={
                weekly.adherence.workout.percent !== null
                  ? t("đạt {value1}%", { value1: weekly.adherence.workout.percent })
                  : undefined
              }
            />
            <Stat
              label="Volume"
              value={`${formatNumber(weekly.workout.totalVolume)} kg`}
              hint={
                weekly.workout.volumeChange !== null
                  ? t("{value1} so tuần trước", { value1: formatSignedPercent(weekly.workout.volumeChange) })
                  : undefined
              }
            />
            <Stat label={t("PR mới")} value={String(weekly.newPersonalRecords)} />
            <Stat label={t("Đúng calo")} {...formatDayAdherence(weekly.adherence.calories)} />
            <Stat label={t("Đủ protein")} {...formatDayAdherence(weekly.adherence.protein)} />
            <Stat label={t("Thời gian tập")} value={formatDuration(weekly.workout.duration)} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function HeroRing({
  label,
  value,
  detail,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  progress: number;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <View style={styles.ringItem}>
      <RingProgress
        progress={progress}
        size={84}
        strokeWidth={9}
        color={colors.onGradient}
        trackColor={colors.onGradientTrack}
        accessibilityLabel={`${label}: ${value} ${detail}`}
      >
        <Text style={styles.ringValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </RingProgress>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringDetail}>
        {detail}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quick, shadow(1), pressed && styles.pressed]}
    >
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.onPrimary} />
      </View>
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  "use no memo"; // Locale-aware legacy formatters/getters read the external language store.

  useTranslation();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { padding: spacing.xl, gap: spacing.xs },
  greeting: { fontSize: 14, fontWeight: "600", color: colors.onGradientMuted },
  name: { fontSize: 26, fontWeight: "800", color: colors.onGradient, letterSpacing: -0.4 },
  weightRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  weight: { maxWidth: "100%", fontSize: 22, fontWeight: "800", color: colors.onGradient, fontVariant: ["tabular-nums"] },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%",
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
    backgroundColor: colors.onGradientTrack,
  },
  pillText: { flexShrink: 1, minWidth: 0, fontSize: 12, fontWeight: "700", color: colors.onGradient },
  rings: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.sm, rowGap: spacing.md, marginTop: spacing.lg },
  ringItem: { alignItems: "center", flexGrow: 1, flexBasis: 84, minWidth: 84, gap: 2 },
  ringValue: { fontSize: 16, fontWeight: "800", color: colors.onGradient, maxWidth: 62, textAlign: "center", fontVariant: ["tabular-nums"] },
  ringLabel: { maxWidth: "100%", marginTop: spacing.xs, fontSize: 11, fontWeight: "800", color: colors.onGradient, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },
  ringDetail: { maxWidth: "100%", fontSize: 12, color: colors.onGradientMuted, textAlign: "center" },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
  tilesScroll: { marginHorizontal: -spacing.lg },
  tiles: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  muted: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: { flexGrow: 1, flexShrink: 1, flexBasis: "30%", minWidth: 120, gap: 4, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  statValue: { width: "100%", fontSize: 18, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  statLabel: { maxWidth: "100%", fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  statHint: { maxWidth: "100%", fontSize: 12, color: colors.textMuted },
  quickRow: { flexDirection: "row", gap: spacing.md },
  quick: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickIcon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  quickText: { maxWidth: "100%", textAlign: "center", fontSize: 13, fontWeight: "700", color: colors.text },
  pressed: { opacity: 0.7 },
}));
