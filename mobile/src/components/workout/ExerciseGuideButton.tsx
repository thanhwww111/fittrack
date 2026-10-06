import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Modal, Platform, ScrollView, Text, View } from "react-native";
import { AppPressable as Pressable } from "@/components/ui/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, themedStyles } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { getExerciseGuide, type ExerciseGuide } from "@/lib/exerciseGuides";
import { exerciseNote } from "@/lib/exerciseNames";
import { Button } from "@/components/ui/Button";
import { ExerciseAnimation } from "./ExerciseAnimation";

export function ExerciseGuideButton({ name, isCustom = false }: { name: string; isCustom?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const guide = getExerciseGuide(name, isCustom);
  if (!guide) return null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("Xem động tác {name}", { name })}
      onPress={event => { event.stopPropagation(); setOpen(true); }} style={styles.open}>
      <Ionicons name="play-circle-outline" size={21} color={colors.primaryText} />
      <Text style={styles.openText}>{t("Xem động tác")}</Text>
    </Pressable>
    {open ? <GuideModal key={name} name={name} guide={guide} onClose={() => setOpen(false)} /> : null}
  </>;
}

function GuideModal({ name, guide, onClose }: { name: string; guide: ExerciseGuide; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const touchedPlayback = useRef(false);
  useEffect(() => {
    let alive = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then(reduced => {
      if (alive && !touchedPlayback.current) setPlaying(!reduced);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", reduced => {
      if (reduced) setPlaying(false);
    });
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    globalThis.document?.addEventListener("keydown", closeOnEscape);
    return () => globalThis.document?.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: Math.max(insets.top, spacing.lg), paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <Pressable style={styles.backdrop} onPress={onClose} accessible={false} />
      <View style={styles.panel} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{name}</Text>
            {locale === "vi" ? <Text style={styles.muted}>{exerciseNote(name)}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Đóng hướng dẫn")} onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={25} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.muted}>{t("Hoạt ảnh 2D · Minh họa chuyển động")}</Text>
          <ExerciseAnimation movement={guide.movement} playing={playing} speed={speed}
            label={t("Minh họa động tác {name}", { name })} />
          <View style={styles.controls}>
            <Button title={playing ? t("Tạm dừng") : t("Phát")} variant="secondary"
              onPress={() => { touchedPlayback.current = true; setPlaying(value => !value); }} />
            <View style={styles.speedGroup} accessibilityRole="radiogroup" accessibilityLabel={t("Tốc độ phát")}>
              {[0.5, 1].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value}×`}
                accessibilityState={{ selected: speed === value }} onPress={() => setSpeed(value)}
                style={[styles.speed, speed === value && styles.selected]}>
                <Text style={styles.text}>{value}×</Text>
              </Pressable>)}
            </View>
          </View>
          <Text style={styles.section}>{t("Cách thực hiện")}</Text>
          {guide.steps[locale].map((step, index) => <Text key={index} style={styles.text}>{index + 1}. {step}</Text>)}
          <View style={styles.tip}>
            <Text style={styles.section}>{t("Điểm cần chú ý")}</Text>
            <Text style={styles.text}>{guide.tip[locale]}</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = themedStyles(() => ({
  open: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44, alignSelf: "flex-start", paddingHorizontal: spacing.sm },
  openText: { color: colors.primaryText, fontSize: 14, fontWeight: "600" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay },
  panel: { width: "100%", maxWidth: 560, maxHeight: "100%", flexShrink: 1, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  close: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.md, gap: spacing.md },
  controls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  speedGroup: { flexDirection: "row", gap: spacing.xs },
  speed: { minWidth: 54, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  section: { color: colors.text, fontSize: 16, fontWeight: "700" },
  tip: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
}));
