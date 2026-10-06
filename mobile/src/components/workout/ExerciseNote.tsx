import { Text } from "react-native";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { exerciseNote } from "@/lib/exerciseNames";

export function ExerciseNote({ name, isCustom = false }: { name: string; isCustom?: boolean }) {
  const { locale } = useTranslation();
  const note = exerciseNote(name, isCustom);
  return locale === "vi" && note ? <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>{note}</Text> : null;
}
